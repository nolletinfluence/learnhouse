import logging
import secrets
from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.db.courses.activities import Activity
from src.db.courses.certifications import (
    CertificateUser,
    CertificateUserRead,
    CertificationCreate,
    CertificationRead,
    Certifications,
    CertificationUpdate,
)
from src.db.courses.chapter_activities import ChapterActivity
from src.db.courses.courses import Course
from src.db.trail_steps import TrailStep
from src.db.user_audit_events import UserAuditEventType
from src.db.users import AnonymousUser, PublicUser, User
from src.security.rbac import AccessAction, check_resource_access
from src.services.analytics import events as analytics_events
from src.services.analytics.analytics import track
from src.services.audit.audit import record_audit_event
from src.services.webhooks.dispatch import dispatch_webhooks

logger = logging.getLogger(__name__)




async def create_certification(
    request: Request,
    certification_object: CertificationCreate,
    current_user: PublicUser | AnonymousUser,
    db_session: AsyncSession,
) -> CertificationRead:
    """Create a new certification for a course"""
    
    statement = select(Course).where(Course.id == certification_object.course_id)
    course = (await db_session.execute(statement)).scalars().first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    await check_resource_access(request, db_session, current_user, course.course_uuid, AccessAction.CREATE)

    certification = Certifications(
        course_id=certification_object.course_id,
        config=certification_object.config or {},
        certification_uuid=str(f"certification_{uuid4()}"),
        creation_date=str(datetime.now()),
        update_date=str(datetime.now()),
    )

    db_session.add(certification)
    await db_session.commit()
    await db_session.refresh(certification)

    return CertificationRead(**certification.model_dump())


async def get_certification(
    request: Request,
    certification_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: AsyncSession,
) -> CertificationRead:
    """Get a single certification by certification_id"""
    
    statement = select(Certifications).where(Certifications.certification_uuid == certification_uuid)
    certification = (await db_session.execute(statement)).scalars().first()

    if not certification:
        raise HTTPException(
            status_code=404,
            detail="Certification not found",
        )

    statement = select(Course).where(Course.id == certification.course_id)
    course = (await db_session.execute(statement)).scalars().first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    await check_resource_access(request, db_session, current_user, course.course_uuid, AccessAction.READ)

    return CertificationRead(**certification.model_dump())


async def get_certifications_by_course(
    request: Request,
    course_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: AsyncSession,
) -> list[CertificationRead]:
    """Get all certifications for a course"""
    
    statement = select(Course).where(Course.course_uuid == course_uuid)
    course = (await db_session.execute(statement)).scalars().first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    await check_resource_access(request, db_session, current_user, course_uuid, AccessAction.READ)

    statement = select(Certifications).where(Certifications.course_id == course.id)
    certifications = (await db_session.execute(statement)).scalars().all()

    return [CertificationRead(**certification.model_dump()) for certification in certifications]


async def update_certification(
    request: Request,
    certification_uuid: str,
    certification_object: CertificationUpdate,
    current_user: PublicUser | AnonymousUser,
    db_session: AsyncSession,
) -> CertificationRead:
    """Update a certification"""
    
    statement = select(Certifications).where(Certifications.certification_uuid == certification_uuid)
    certification = (await db_session.execute(statement)).scalars().first()

    if not certification:
        raise HTTPException(
            status_code=404,
            detail="Certification not found",
        )

    statement = select(Course).where(Course.id == certification.course_id)
    course = (await db_session.execute(statement)).scalars().first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    await check_resource_access(request, db_session, current_user, course.course_uuid, AccessAction.UPDATE)

    for var, value in vars(certification_object).items():
        if value is not None:
            setattr(certification, var, value)

    certification.update_date = str(datetime.now())

    db_session.add(certification)
    await db_session.commit()
    await db_session.refresh(certification)

    return CertificationRead(**certification.model_dump())


async def delete_certification(
    request: Request,
    certification_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: AsyncSession,
) -> dict:
    """Delete a certification"""
    
    statement = select(Certifications).where(Certifications.certification_uuid == certification_uuid)
    certification = (await db_session.execute(statement)).scalars().first()

    if not certification:
        raise HTTPException(
            status_code=404,
            detail="Certification not found",
        )

    statement = select(Course).where(Course.id == certification.course_id)
    course = (await db_session.execute(statement)).scalars().first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    await check_resource_access(request, db_session, current_user, course.course_uuid, AccessAction.DELETE)

    awarded_count = (await db_session.execute(
        select(func.count(CertificateUser.id)).where(
            CertificateUser.certification_id == certification.id
        )
    )).scalar_one()

    if awarded_count:
        raise HTTPException(
            status_code=409,
            detail=(
                f"This certification has {awarded_count} awarded "
                f"certificate{'s' if awarded_count != 1 else ''}. Deleting it would "
                "permanently destroy them and break the verification links their "
                "holders have shared. Disable the certification instead, or revoke "
                "the certificates individually first."
            ),
        )

    await db_session.delete(certification)
    await db_session.commit()

    return {"detail": "Certification deleted successfully"}




async def create_certificate_user(
    request: Request,
    user_id: int,
    certification_id: int,
    db_session: AsyncSession,
    current_user: PublicUser | AnonymousUser | None = None,
) -> CertificateUserRead:
    """
    Create a certificate user link
    
    SECURITY NOTES:
    - This function should only be called by authorized users (course owners, instructors, or system)
    - When called from check_course_completion_and_create_certificate, it's a system operation
    - When called directly, requires proper RBAC checks
    """
    
    statement = select(Certifications).where(Certifications.id == certification_id)
    certification = (await db_session.execute(statement)).scalars().first()

    if not certification:
        raise HTTPException(
            status_code=404,
            detail="Certification not found",
        )

    if current_user:
        statement = select(Course).where(Course.id == certification.course_id)
        course = (await db_session.execute(statement)).scalars().first()

        if not course:
            raise HTTPException(
                status_code=404,
                detail="Course not found",
            )

        await check_resource_access(request, db_session, current_user, course.course_uuid, AccessAction.CREATE)

    statement = select(CertificateUser).where(
        CertificateUser.user_id == user_id,
        CertificateUser.certification_id == certification_id
    )
    existing_certificate_user = (await db_session.execute(statement)).scalars().first()

    if existing_certificate_user:
        raise HTTPException(
            status_code=400,
            detail="User already has a certificate for this course",
        )

    current_year = datetime.now().year
    current_month = datetime.now().month
    current_day = datetime.now().day
    
    from src.db.users import User
    statement = select(User).where(User.id == user_id)
    user = (await db_session.execute(statement)).scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )
    
    user_uuid_short = user.user_uuid[-4:] if user.user_uuid else "USER"
    
    _alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    random_prefix = secrets.choice(_alpha) + secrets.choice(_alpha)

    today_user_prefix = f"{random_prefix}-{current_year}{current_month:02d}{current_day:02d}-{user_uuid_short}-"

    next_number_str = secrets.token_hex(4)  # 8-char hex suffix, collision-safe

    user_certification_uuid = f"{today_user_prefix}{next_number_str}"

    certificate_user = CertificateUser(
        user_id=user_id,
        certification_id=certification_id,
        user_certification_uuid=user_certification_uuid,
        created_at=str(datetime.now()),
        updated_at=str(datetime.now()),
    )

    db_session.add(certificate_user)
    try:
        await db_session.commit()
    except IntegrityError:
        await db_session.rollback()
        existing = (
            await db_session.execute(
                select(CertificateUser).where(
                    CertificateUser.user_id == user_id,
                    CertificateUser.certification_id == certification_id,
                )
            )
        ).scalars().first()
        if existing:
            return CertificateUserRead(**existing.model_dump())
        raise
    await db_session.refresh(certificate_user)

    try:
        course = (await db_session.execute(
            select(Course).where(Course.id == certification.course_id)
        )).scalars().first()
        if course:
            await track(
                event_name=analytics_events.CERTIFICATE_CLAIMED,
                org_id=course.org_id,
                user_id=user_id,
                properties={
                    "course_uuid": course.course_uuid,
                },
            )
            await record_audit_event(
                event_type=UserAuditEventType.CERTIFICATE_CLAIMED,
                user_id=user_id,
                org_id=course.org_id,
                target_uuid=user_certification_uuid,
                metadata={
                    "course_uuid": course.course_uuid,
                    "course_name": course.name,
                },
            )
            await dispatch_webhooks(
                event_name=analytics_events.CERTIFICATE_CLAIMED,
                org_id=course.org_id,
                data={
                    "user": {
                        "user_uuid": user.user_uuid,
                        "email": user.email,
                        "username": user.username,
                    },
                    "course": {
                        "course_uuid": course.course_uuid,
                        "name": course.name,
                    },
                    "certificate": {
                        "user_certification_uuid": certificate_user.user_certification_uuid,
                    },
                },
            )
    except Exception as e:
        logger.warning("Certificate tracking failed (non-critical): %s", e)

    return CertificateUserRead(**certificate_user.model_dump())


async def revoke_user_certificate(
    user_id: int,
    course_id: int,
    db_session: AsyncSession,
    reason: str = "revoked",
) -> bool:
    """Revoke any certificate this user holds for the given course.

    Deletes the CertificateUser row and emits a ``certificate_revoked``
    analytics + webhook event so downstream systems learn the certificate is no
    longer valid (previously the row was silently deleted on retry/reject with
    no signal, and a re-pass fired a second ``certificate_claimed``). No-ops and
    returns False when the course has no certification or the user holds none.
    The event dispatch is best-effort and never fails the caller.
    """
    from src.db.users import User

    certification = (await db_session.execute(
        select(Certifications).where(Certifications.course_id == course_id)
    )).scalars().first()
    if not certification or not certification.id:
        return False

    cert_user = (await db_session.execute(
        select(CertificateUser).where(
            CertificateUser.user_id == user_id,
            CertificateUser.certification_id == certification.id,
        )
    )).scalars().first()
    if not cert_user:
        return False

    revoked_uuid = cert_user.user_certification_uuid
    await db_session.delete(cert_user)
    await db_session.commit()

    try:
        course = (await db_session.execute(
            select(Course).where(Course.id == course_id)
        )).scalars().first()
        user = (await db_session.execute(
            select(User).where(User.id == user_id)
        )).scalars().first()
        if course:
            await track(
                event_name=analytics_events.CERTIFICATE_REVOKED,
                org_id=course.org_id,
                user_id=user_id,
                properties={"course_uuid": course.course_uuid, "reason": reason},
            )
            await dispatch_webhooks(
                event_name=analytics_events.CERTIFICATE_REVOKED,
                org_id=course.org_id,
                data={
                    "user": {
                        "user_uuid": getattr(user, "user_uuid", None),
                        "email": getattr(user, "email", None),
                        "username": getattr(user, "username", None),
                    },
                    "course": {
                        "course_uuid": course.course_uuid,
                        "name": course.name,
                    },
                    "certificate": {"user_certification_uuid": revoked_uuid},
                    "reason": reason,
                },
            )
    except Exception as e:
        logger.warning("Certificate revocation tracking failed (non-critical): %s", e)

    return True


async def get_user_certificates_for_course(
    request: Request,
    course_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: AsyncSession,
) -> list[dict]:
    """Get all certificates for a user in a specific course with certification details"""
    
    statement = select(Course).where(Course.course_uuid == course_uuid)
    course = (await db_session.execute(statement)).scalars().first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    await check_resource_access(request, db_session, current_user, course_uuid, AccessAction.READ)

    statement = select(Certifications).where(Certifications.course_id == course.id)
    certifications = (await db_session.execute(statement)).scalars().all()

    if not certifications:
        return []

    certification_ids = [cert.id for cert in certifications if cert.id]
    if not certification_ids:
        return []

    statement = select(CertificateUser).where(
        CertificateUser.user_id == current_user.id,
        CertificateUser.certification_id.in_(certification_ids)  # type: ignore
    )
    cert_users = (await db_session.execute(statement)).scalars().all()

    if not cert_users:
        return []

    cert_map = {cert.id: cert for cert in certifications if cert.id}

    recipient = {
        "user_uuid": getattr(current_user, "user_uuid", None),
        "username": getattr(current_user, "username", None),
        "first_name": getattr(current_user, "first_name", None),
        "last_name": getattr(current_user, "last_name", None),
    }

    result = []
    for cert_user in cert_users:
        certification = cert_map.get(cert_user.certification_id)
        result.append({
            "certificate_user": CertificateUserRead(**cert_user.model_dump()),
            "certification": CertificationRead(**certification.model_dump()) if certification else None,
            "user": recipient,
        })

    return result


async def is_course_fully_completed(
    user_id: int,
    course_id: int,
    db_session: AsyncSession,
) -> bool:
    """
    Pure completion check: returns True iff every activity in the course has
    a completed TrailStep for the given user. No side effects, no certificate
    involvement.

    Uses COUNT aggregates instead of fetching all rows so this stays fast
    even on large courses.
    """
    total_activities = (await db_session.execute(
        select(func.count(ChapterActivity.id))
        .join(Activity, Activity.id == ChapterActivity.activity_id)
        .where(ChapterActivity.course_id == course_id, Activity.published == True)
    )).scalar_one()
    if not total_activities:
        return False

    completed_activities = (await db_session.execute(
        select(func.count(func.distinct(TrailStep.activity_id)))
        .join(
            ChapterActivity,
            (ChapterActivity.activity_id == TrailStep.activity_id)
            & (ChapterActivity.course_id == TrailStep.course_id),
        )
        .join(Activity, Activity.id == ChapterActivity.activity_id)
        .where(
            TrailStep.user_id == user_id,
            TrailStep.course_id == course_id,
            TrailStep.complete == True,
            TrailStep.teacher_verified == True,
            Activity.published == True,
        )
    )).scalar_one()

    return completed_activities >= total_activities


async def sync_trailrun_status(
    user_id: int,
    course_id: int,
    db_session: AsyncSession,
    is_complete: bool | None = None,
) -> None:
    """
    Keep the enrollment row (TrailRun.status) in sync with actual course
    completion. This is the single field every enrollment/analytics "completed"
    vs "in progress" number is derived from, yet nothing used to flip it — so
    fully completed, certified learners still counted as in-progress.

    Derives the status from :func:`is_course_fully_completed` and promotes the
    run to STATUS_COMPLETED when done, or demotes it back to STATUS_IN_PROGRESS
    if completion was lost (e.g. an activity was un-completed). PAUSED and
    CANCELLED runs are left untouched — those are explicit learner/teacher
    states, not derived from progress. No-ops when nothing needs to change.
    """
    from src.db.trail_runs import StatusEnum, TrailRun

    trailrun = (await db_session.execute(
        select(TrailRun).where(
            TrailRun.course_id == course_id,
            TrailRun.user_id == user_id,
        )
    )).scalars().first()

    if not trailrun:
        return

    if trailrun.status not in (
        StatusEnum.STATUS_IN_PROGRESS,
        StatusEnum.STATUS_COMPLETED,
    ):
        return

    if is_complete is None:
        is_complete = await is_course_fully_completed(user_id, course_id, db_session)
    target = (
        StatusEnum.STATUS_COMPLETED if is_complete else StatusEnum.STATUS_IN_PROGRESS
    )

    if trailrun.status != target:
        trailrun.status = target
        trailrun.update_date = str(datetime.now())
        db_session.add(trailrun)
        await db_session.commit()


async def are_course_assignments_passed(
    user_id: int,
    course_id: int,
    db_session: AsyncSession,
) -> bool:
    """
    Certificate eligibility gate: returns True iff EVERY assignment activity in
    the course has been graded AND passed by the user.

    - A course with no assignments returns True (completion alone certifies).
    - A missing submission, a not-yet-GRADED submission (SUBMITTED/PENDING), or a
      graded-but-failed submission all return False, so the certificate is
      withheld until the learner actually passes.
    - Pass/fail reuses the canonical grader with the assignment's configured
      threshold, so "certified" always agrees with the score shown to the learner.

    This is intentionally separate from course *completion* (progress/analytics):
    completion means "all activities done", certification means "all assessments
    passed".
    """
    from src.db.courses.assignments import (
        Assignment,
        AssignmentTask,
        AssignmentUserSubmission,
        AssignmentUserSubmissionStatus,
    )
    from src.services.courses.activities.assignments import compute_assignment_grade

    assignments = (await db_session.execute(
        select(Assignment).where(
            Assignment.course_id == course_id,
            Assignment.activity_id.in_(
                select(ChapterActivity.activity_id).where(
                    ChapterActivity.course_id == course_id
                )
            ),
        )
    )).scalars().all()

    if not assignments:
        return True

    assignment_ids = [a.id for a in assignments if a.id is not None]

    max_rows = (await db_session.execute(
        select(
            AssignmentTask.assignment_id,
            func.coalesce(func.sum(AssignmentTask.max_grade_value), 0),
        )
        .where(AssignmentTask.assignment_id.in_(assignment_ids))
        .group_by(AssignmentTask.assignment_id)
    )).all()
    max_by_assignment = {aid: int(m or 0) for aid, m in max_rows}

    subs = (await db_session.execute(
        select(AssignmentUserSubmission).where(
            AssignmentUserSubmission.user_id == user_id,
            AssignmentUserSubmission.assignment_id.in_(assignment_ids),
        )
    )).scalars().all()
    sub_by_assignment = {s.assignment_id: s for s in subs}

    for assignment in assignments:
        if max_by_assignment.get(assignment.id, 0) <= 0:
            continue
        sub = sub_by_assignment.get(assignment.id)
        if sub is None:
            return False
        if sub.submission_status != AssignmentUserSubmissionStatus.GRADED:
            return False
        computed = compute_assignment_grade(
            int(sub.grade or 0),
            max_by_assignment.get(assignment.id, 0),
            assignment.grading_type,
            pass_threshold_percentage=assignment.pass_threshold_percentage,
        )
        if not computed["passed"]:
            return False

    return True


async def check_course_completion_and_create_certificate(
    request: Request,
    user_id: int,
    course_id: int,
    db_session: AsyncSession,
    is_complete: bool | None = None,
) -> bool:
    """
    Check if all activities in a course are completed and create certificate if so.

    NOTE: Returns True only when this call *creates a new certificate row*.
    That is False for courses without a certification even when the course is
    actually complete — do NOT use this return value as the trigger for
    ``course_completed`` webhooks. Use :func:`is_course_fully_completed` for
    that, and call this function purely for the certificate side effect.

    ``is_complete`` lets a caller that has already run
    :func:`is_course_fully_completed` hand the answer over. The completion
    aggregates are identical, and the submit path used to run them three times
    for one submission: once here, once inside ``sync_trailrun_status``, and
    once more in the caller to gate the ``course_completed`` event.

    SECURITY NOTES:
    - This function is called by the system when activities are completed
    - It should only create certificates for users who have actually completed the course
    - The function is called from mark_activity_as_done_for_user which already has RBAC checks
    """
    if is_complete is None:
        is_complete = await is_course_fully_completed(user_id, course_id, db_session)

    await sync_trailrun_status(user_id, course_id, db_session, is_complete=is_complete)

    if is_complete:
        statement = select(Certifications).where(Certifications.course_id == course_id)
        certification = (await db_session.execute(statement)).scalars().first()
        
        if certification and certification.id:
            if not await are_course_assignments_passed(user_id, course_id, db_session):
                return False
            try:
                await create_certificate_user(request, user_id, certification.id, db_session)
                return True  # Newly completed
            except HTTPException as e:
                if e.status_code == 400 and "already has a certificate" in e.detail:
                    return False
                else:
                    raise e
        
    return False


async def get_certificate_by_user_certification_uuid(
    request: Request,
    user_certification_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: AsyncSession,
) -> dict:
    """Get a certificate by user_certification_uuid with certification details"""
    
    statement = select(CertificateUser).where(
        CertificateUser.user_certification_uuid == user_certification_uuid
    )
    certificate_user = (await db_session.execute(statement)).scalars().first()

    if not certificate_user:
        raise HTTPException(
            status_code=404,
            detail="Certificate not found",
        )

    statement = select(Certifications).where(Certifications.id == certificate_user.certification_id)
    certification = (await db_session.execute(statement)).scalars().first()

    if not certification:
        raise HTTPException(
            status_code=404,
            detail="Certification not found",
        )

    statement = select(Course).where(Course.id == certification.course_id)
    course = (await db_session.execute(statement)).scalars().first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    user = await db_session.get(User, certificate_user.user_id)

    return {
        "certificate_user": CertificateUserRead(**certificate_user.model_dump()),
        "certification": CertificationRead(**certification.model_dump()),
        "user": {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "username": user.username,
        } if user else None,
        "course": {
            "id": course.id,
            "course_uuid": course.course_uuid,
            "name": course.name,
            "description": course.description,
            "thumbnail_image": course.thumbnail_image,
        }
    }


async def get_all_user_certificates(
    request: Request,
    current_user: PublicUser | AnonymousUser,
    db_session: AsyncSession,
) -> list[dict]:
    """Get all certificates for the current user with complete linked information"""
    
    statement = select(CertificateUser).where(CertificateUser.user_id == current_user.id)
    certificate_users = (await db_session.execute(statement)).scalars().all()

    if not certificate_users:
        return []

    cert_ids = list({cu.certification_id for cu in certificate_users})
    statement = select(Certifications).where(Certifications.id.in_(cert_ids))  # type: ignore
    certifications = (await db_session.execute(statement)).scalars().all()
    cert_map = {cert.id: cert for cert in certifications}

    course_ids = list({cert.course_id for cert in certifications if cert.course_id})
    if course_ids:
        statement = select(Course).where(Course.id.in_(course_ids))  # type: ignore
        courses = (await db_session.execute(statement)).scalars().all()
        course_map = {course.id: course for course in courses}
    else:
        course_map = {}

    from src.db.users import User
    user_ids = list({cu.user_id for cu in certificate_users})
    statement = select(User).where(User.id.in_(user_ids))  # type: ignore
    users = (await db_session.execute(statement)).scalars().all()
    user_map = {user.id: user for user in users}

    result = []
    for cert_user in certificate_users:
        certification = cert_map.get(cert_user.certification_id)
        if not certification:
            continue

        course = course_map.get(certification.course_id)
        if not course:
            continue

        user = user_map.get(cert_user.user_id)

        result.append({
            "certificate_user": CertificateUserRead(**cert_user.model_dump()),
            "certification": CertificationRead(**certification.model_dump()),
            "course": {
                "id": course.id,
                "course_uuid": course.course_uuid,
                "name": course.name,
                "description": course.description,
                "thumbnail_image": course.thumbnail_image,
            },
            "user": {
                "id": user.id if user else None,
                "user_uuid": user.user_uuid if user else None,
                "username": user.username if user else None,
                "email": user.email if user else None,
                "first_name": user.first_name if user else None,
                "last_name": user.last_name if user else None,
            } if user else None
        })

    return result
