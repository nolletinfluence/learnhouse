from datetime import UTC, datetime
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import func
from sqlmodel import select

from src.db.courses.activities import Activity, ActivitySubTypeEnum, ActivityTypeEnum
from src.db.courses.chapter_activities import ChapterActivity
from src.db.courses.chapters import Chapter
from src.db.courses.course_chapters import CourseChapter
from src.db.courses.courses import Course
from src.db.courses.learning import EnrollmentRequest, LessonAttendance
from src.db.resource_authors import (
    ResourceAuthor,
    ResourceAuthorshipEnum,
    ResourceAuthorshipStatusEnum,
)
from src.db.trail_runs import StatusEnum, TrailRun
from src.db.trail_steps import TrailStep
from src.db.trails import Trail
from src.db.user_organizations import UserOrganization
from src.db.users import AnonymousUser, APITokenUser, User
from src.security.auth import resolve_acting_user_id
from src.security.org_auth import is_org_admin, require_org_membership
from src.security.rbac import AccessAction, check_resource_access
from src.security.rbac.constants import ADMIN_ROLE_ID
from src.services.courses.learning_access import (
    course_learning_access,
    require_course_learning_access,
)


def timestamp():
    return datetime.now(UTC).isoformat()


async def load_course(course_uuid, db, lock=False):
    query = select(Course).where(Course.course_uuid == course_uuid)
    if lock:
        query = query.with_for_update()
    course = (await db.execute(query)).scalars().first()
    if not course:
        raise HTTPException(404, "Course not found")
    return course


def require_session(user):
    if isinstance(user, (AnonymousUser, APITokenUser)):
        raise HTTPException(401, "Sign in with a user account")


async def require_application_admin(user, org_id, db, action="action_read"):
    if isinstance(user, APITokenUser):
        from src.services.admin.admin import _require_token_right
        if user.org_id != org_id:
            raise HTTPException(403, "Organization mismatch")
        _require_token_right(user, "courses", action)
        _require_token_right(user, "users", "action_read")
        return
    require_session(user)
    await require_org_membership(user.id, org_id, db)
    if getattr(user, "is_superadmin", False):
        return
    membership = (await db.execute(select(UserOrganization).where(
        UserOrganization.user_id == user.id, UserOrganization.org_id == org_id,
        UserOrganization.role_id == ADMIN_ROLE_ID))).scalars().first()
    if not membership:
        raise HTTPException(403, "Only an administrator can approve enrollment")


async def require_teacher(request, course, user, db):
    require_session(user)
    await require_org_membership(user.id, course.org_id, db)
    if await course_learning_access(course, user, db) != "staff":
        raise HTTPException(403, "Only course mentors can manage the journal")
    await check_resource_access(request, db, user, course.course_uuid, AccessAction.UPDATE)


async def request_enrollment(request, course_uuid, user, db):
    require_session(user)
    course = await load_course(course_uuid, db, lock=True)
    await require_org_membership(user.id, course.org_id, db)
    await check_resource_access(request, db, user, course.course_uuid, AccessAction.READ)
    access = await course_learning_access(course, user, db)
    if access == "staff":
        raise HTTPException(403, "Staff use course preview")
    if access == "enrolled":
        return {"status": "approved"}
    if not course.published:
        raise HTTPException(403, "Course is not accepting applications")
    application = (await db.execute(select(EnrollmentRequest).where(
        EnrollmentRequest.course_id == course.id, EnrollmentRequest.user_id == user.id,
    ))).scalars().first()
    if not application:
        application = EnrollmentRequest(course_id=course.id, org_id=course.org_id,
            user_id=user.id, creation_date=timestamp(), update_date=timestamp())
    elif application.status != "pending":
        application.status = "pending"
        application.decided_by = None
        application.update_date = timestamp()
    db.add(application)
    await db.commit()
    return {"status": application.status}


async def list_requests(org_id, user, db):
    await require_application_admin(user, org_id, db)
    rows = (await db.execute(select(EnrollmentRequest, Course, User)
        .join(Course, Course.id == EnrollmentRequest.course_id)
        .join(User, User.id == EnrollmentRequest.user_id)
        .where(EnrollmentRequest.org_id == org_id, Course.org_id == org_id,
               EnrollmentRequest.status == "pending")
        .order_by(EnrollmentRequest.creation_date))).all()
    return [{**application.model_dump(), "course_name": course.name,
             "course_uuid": course.course_uuid,
             "student_name": f"{student.first_name} {student.last_name}".strip() or student.username,
             "email": student.email} for application, course, student in rows]


async def decide_request(application_id, decision, user, db):
    application = (await db.execute(select(EnrollmentRequest)
        .where(EnrollmentRequest.id == application_id))).scalars().first()
    if not application:
        raise HTTPException(404, "Application not found")
    await require_application_admin(user, application.org_id, db, "action_update")
    await require_org_membership(application.user_id, application.org_id, db)
    course = (await db.execute(select(Course).where(Course.id == application.course_id)
        .with_for_update())).scalars().first()
    if not course or course.org_id != application.org_id:
        raise HTTPException(404, "Course not found")
    await db.refresh(application, with_for_update=True)
    if application.status != "pending":
        raise HTTPException(409, "Application has already been reviewed")
    if decision == "approved":
        student = (await db.execute(select(User).where(User.id == application.user_id).with_for_update())).scalars().first()
        if not student or await course_learning_access(course, student, db) == "staff":
            raise HTTPException(409, "Staff cannot be enrolled as students")
        trail = (await db.execute(select(Trail).where(Trail.org_id == course.org_id,
            Trail.user_id == application.user_id))).scalars().first()
        if not trail:
            trail = Trail(org_id=course.org_id, user_id=application.user_id,
                trail_uuid=f"trail_{uuid4()}", creation_date=timestamp(), update_date=timestamp())
            db.add(trail)
            await db.flush()
        run = (await db.execute(select(TrailRun).where(TrailRun.course_id == course.id,
            TrailRun.user_id == application.user_id))).scalars().first()
        if not run:
            run = TrailRun(trail_id=trail.id, course_id=course.id, org_id=course.org_id,
                user_id=application.user_id, creation_date=timestamp(), update_date=timestamp())
        elif run.status == StatusEnum.STATUS_CANCELLED:
            run.status = StatusEnum.STATUS_IN_PROGRESS
            run.update_date = timestamp()
        db.add(run)
    application.status = decision
    application.decided_by = resolve_acting_user_id(user)
    application.update_date = timestamp()
    db.add(application)
    await db.commit()
    return {"status": application.status}


async def course_journal(request, course_uuid, user, db):
    course = await load_course(course_uuid, db)
    await require_teacher(request, course, user, db)
    rows = (await db.execute(select(TrailRun, User).join(User, User.id == TrailRun.user_id)
        .where(TrailRun.course_id == course.id, TrailRun.org_id == course.org_id,
               TrailRun.status != StatusEnum.STATUS_CANCELLED)
        .order_by(User.first_name, User.last_name))).all()
    attendance = (await db.execute(select(LessonAttendance).where(
        LessonAttendance.course_id == course.id, LessonAttendance.org_id == course.org_id,
    ))).scalars().all()
    return {"students": [{"id": student.id,
        "name": f"{student.first_name} {student.last_name}".strip() or student.username,
        "email": student.email} for _, student in rows],
        "attendance": [entry.model_dump() for entry in attendance]}


async def mark_attendance(request, course_uuid, activity_uuid, student_id, payload, user, db):
    course = await load_course(course_uuid, db)
    await require_teacher(request, course, user, db)
    await require_org_membership(student_id, course.org_id, db)
    activity = (await db.execute(select(Activity).where(Activity.activity_uuid == activity_uuid,
        Activity.course_id == course.id, Activity.org_id == course.org_id))).scalars().first()
    if not activity:
        raise HTTPException(404, "Lesson not found in this course")
    run = (await db.execute(select(TrailRun).where(TrailRun.course_id == course.id,
        TrailRun.user_id == student_id, TrailRun.org_id == course.org_id,
        TrailRun.status != StatusEnum.STATUS_CANCELLED).with_for_update())).scalars().first()
    if not run:
        raise HTTPException(409, "Student is not enrolled")
    entry = (await db.execute(select(LessonAttendance).where(
        LessonAttendance.activity_id == activity.id, LessonAttendance.user_id == student_id,
    ))).scalars().first()
    if not entry:
        entry = LessonAttendance(activity_id=activity.id, course_id=course.id,
            org_id=course.org_id, user_id=student_id, status=payload.status,
            creation_date=timestamp(), update_date=timestamp())
    entry.status = payload.status
    entry.grade = payload.grade
    entry.note = payload.note
    entry.marked_by = user.id
    entry.update_date = timestamp()
    db.add(entry)
    step = (await db.execute(select(TrailStep).where(TrailStep.trailrun_id == run.id,
        TrailStep.activity_id == activity.id, TrailStep.user_id == student_id))).scalars().first()
    if not step:
        step = TrailStep(trailrun_id=run.id, trail_id=run.trail_id, activity_id=activity.id,
            course_id=course.id, org_id=course.org_id, user_id=student_id,
            complete=False, teacher_verified=True, grade="",
            creation_date=timestamp(), update_date=timestamp())
    step.complete = payload.status == "present"
    step.teacher_verified = True
    step.grade = str(payload.grade) if payload.grade is not None else ""
    step.data = {**(step.data or {}), "attendance": payload.status, "marked_by": user.id}
    step.update_date = timestamp()
    db.add(step)
    await db.flush()
    total = (await db.execute(select(func.count(Activity.id)).where(Activity.course_id == course.id,
        Activity.published == True))).scalar_one()
    completed = (await db.execute(select(func.count(TrailStep.id)).join(Activity,
        Activity.id == TrailStep.activity_id).where(TrailStep.trailrun_id == run.id,
        TrailStep.complete == True, TrailStep.teacher_verified == True,
        Activity.published == True))).scalar_one()
    run.status = StatusEnum.STATUS_COMPLETED if total > 0 and completed >= total else StatusEnum.STATUS_IN_PROGRESS
    run.update_date = timestamp()
    db.add(run)
    await db.commit()
    return entry.model_dump()


async def my_journal(course_uuid, user, db):
    require_session(user)
    course = await load_course(course_uuid, db)
    await require_course_learning_access(course, user, db)
    entries = (await db.execute(select(LessonAttendance).join(Activity, Activity.id == LessonAttendance.activity_id).where(
        Activity.published == True,
        LessonAttendance.course_id == course.id, LessonAttendance.user_id == user.id,
        LessonAttendance.org_id == course.org_id,
    ))).scalars().all()
    return [entry.model_dump(exclude={"marked_by"}) for entry in entries]


async def lesson_calendar(org_id, user, db):
    require_session(user)
    await require_org_membership(user.id, org_id, db)
    query = select(Activity, Course).join(Course, Course.id == Activity.course_id).where(
        Course.org_id == org_id, Activity.org_id == org_id)
    if not await is_org_admin(user.id, org_id, db):
        enrolled = select(TrailRun.course_id).where(TrailRun.user_id == user.id,
            TrailRun.org_id == org_id, TrailRun.status != StatusEnum.STATUS_CANCELLED)
        authored = select(Course.id).join(ResourceAuthor, ResourceAuthor.resource_uuid == Course.course_uuid).where(
            ResourceAuthor.user_id == user.id, Course.org_id == org_id,
            ResourceAuthor.authorship_status == ResourceAuthorshipStatusEnum.ACTIVE,
            ResourceAuthor.authorship.in_([ResourceAuthorshipEnum.CREATOR,
                ResourceAuthorshipEnum.MAINTAINER, ResourceAuthorshipEnum.CONTRIBUTOR]))
        query = query.where((Course.id.in_(enrolled) & (Activity.published == True) & (Course.published == True)) | Course.id.in_(authored))
    rows = (await db.execute(query)).all()
    return [{"activity_uuid": activity.activity_uuid, "name": activity.name,
             "course_uuid": course.course_uuid, "course_name": course.name,
             "timezone": (course.extra_metadata or {}).get("bestdevs_learning", {}).get("timezone", "Asia/Bishkek"),
             **(activity.extra_metadata or {}).get("bestdevs_lesson", {})}
            for activity, course in rows
            if (activity.extra_metadata or {}).get("bestdevs_lesson", {}).get("scheduled_at")]


async def save_settings(request, course_uuid, payload, user, db):
    course = await load_course(course_uuid, db, lock=True)
    await require_teacher(request, course, user, db)
    course.extra_metadata = {**(course.extra_metadata or {}), "bestdevs_learning": payload.model_dump(mode="json")}
    course.update_date = timestamp()
    db.add(course)
    await db.commit()
    return payload


async def save_lesson(request, course_uuid, payload, user, db, activity_uuid=None):
    course = await load_course(course_uuid, db, lock=True)
    await require_teacher(request, course, user, db)
    metadata = {"scheduled_at": payload.scheduled_at.isoformat() if payload.scheduled_at else None,
                "duration_minutes": payload.duration_minutes, "location": payload.location,
                "month": payload.month}
    if activity_uuid:
        activity = (await db.execute(select(Activity).where(Activity.activity_uuid == activity_uuid,
            Activity.course_id == course.id, Activity.org_id == course.org_id))).scalars().first()
        if not activity:
            raise HTTPException(404, "Lesson not found")
        activity.name = payload.name
        activity.published = payload.published
        activity.extra_metadata = {**(activity.extra_metadata or {}), "bestdevs_lesson": metadata}
        activity.update_date = timestamp()
    else:
        chapter = None
        if payload.chapter_id:
            chapter = (await db.execute(select(Chapter).where(Chapter.id == payload.chapter_id,
                Chapter.course_id == course.id, Chapter.org_id == course.org_id))).scalars().first()
            if not chapter:
                raise HTTPException(404, "Month not found in this course")
        else:
            chapters = (await db.execute(select(Chapter).where(Chapter.course_id == course.id))).scalars().all()
            chapter = next((ch for ch in chapters if (ch.extra_metadata or {}).get("bestdevs_month") == payload.month), None)
        if not chapter:
            chapter = Chapter(name=f"Месяц {payload.month}", org_id=course.org_id, course_id=course.id,
                chapter_uuid=f"chapter_{uuid4()}", extra_metadata={"bestdevs_month": payload.month},
                creation_date=timestamp(), update_date=timestamp())
            db.add(chapter)
            await db.flush()
            order = (await db.execute(select(func.max(CourseChapter.order)).where(
                CourseChapter.course_id == course.id))).scalar_one() or 0
            db.add(CourseChapter(course_id=course.id, chapter_id=chapter.id, org_id=course.org_id,
                order=order + 1, creation_date=timestamp(), update_date=timestamp()))
        activity = Activity(name=payload.name, activity_type=ActivityTypeEnum.TYPE_DYNAMIC,
            activity_sub_type=ActivitySubTypeEnum.SUBTYPE_DYNAMIC_PAGE,
            content={"type": "doc", "content": [{"type": "paragraph"}]},
            published=payload.published, course_id=course.id, org_id=course.org_id,
            activity_uuid=f"activity_{uuid4()}", extra_metadata={"bestdevs_lesson": metadata},
            creation_date=timestamp(), update_date=timestamp())
        db.add(activity)
        await db.flush()
        order = (await db.execute(select(func.max(ChapterActivity.order)).where(
            ChapterActivity.chapter_id == chapter.id))).scalar_one() or 0
        db.add(ChapterActivity(chapter_id=chapter.id, activity_id=activity.id, course_id=course.id,
            org_id=course.org_id, order=order + 1, creation_date=timestamp(), update_date=timestamp()))
    activity.last_modified_by_id = user.id
    db.add(activity)
    course.update_date = timestamp()
    db.add(course)
    await db.commit()
    return {"activity_uuid": activity.activity_uuid, "id": activity.id, **metadata}
