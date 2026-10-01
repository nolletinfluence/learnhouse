from fastapi import HTTPException
from sqlmodel import select

from src.db.courses.learning import EnrollmentRequest
from src.db.resource_authors import (
    ResourceAuthor,
    ResourceAuthorshipEnum,
    ResourceAuthorshipStatusEnum,
)
from src.db.trail_runs import StatusEnum, TrailRun
from src.db.user_organizations import UserOrganization
from src.db.users import AnonymousUser, APITokenUser
from src.security.org_auth import enforce_org_mfa
from src.security.rbac.constants import ADMIN_OR_MAINTAINER_ROLE_IDS


async def course_learning_access(course, user, db_session):
    if isinstance(user, AnonymousUser):
        return "anonymous"
    if isinstance(user, APITokenUser):
        return "staff" if user.org_id == course.org_id else "not_enrolled"
    if getattr(user, "is_superadmin", False):
        return "staff"
    membership = (await db_session.execute(select(UserOrganization).where(
        UserOrganization.user_id == user.id, UserOrganization.org_id == course.org_id,
    ))).scalars().first()
    if not membership:
        return "not_enrolled"
    await enforce_org_mfa(user.id, course.org_id, db_session)
    if membership.role_id in ADMIN_OR_MAINTAINER_ROLE_IDS:
        return "staff"
    author = (await db_session.execute(select(ResourceAuthor).where(
        ResourceAuthor.resource_uuid == course.course_uuid,
        ResourceAuthor.user_id == user.id,
        ResourceAuthor.authorship_status == ResourceAuthorshipStatusEnum.ACTIVE,
        ResourceAuthor.authorship.in_([
            ResourceAuthorshipEnum.CREATOR, ResourceAuthorshipEnum.MAINTAINER,
            ResourceAuthorshipEnum.CONTRIBUTOR,
        ]),
    ))).scalars().first()
    if author:
        return "staff"
    run = (await db_session.execute(select(TrailRun).where(
        TrailRun.course_id == course.id, TrailRun.user_id == user.id,
        TrailRun.org_id == course.org_id,
        TrailRun.status != StatusEnum.STATUS_CANCELLED,
    ))).scalars().first()
    if run:
        return "enrolled" if course.published else "unavailable"
    application = (await db_session.execute(select(EnrollmentRequest).where(
        EnrollmentRequest.course_id == course.id, EnrollmentRequest.user_id == user.id,
        EnrollmentRequest.org_id == course.org_id,
    ))).scalars().first()
    if application and application.status in ("pending", "rejected"):
        return application.status
    return "not_enrolled"


async def require_course_learning_access(course, user, db_session):
    access = await course_learning_access(course, user, db_session)
    if access not in ("staff", "enrolled"):
        raise HTTPException(status_code=401 if access == "anonymous" else 403,
                            detail={"code": "ENROLLMENT_REQUIRED", "status": access})
    return access


async def require_lesson_learning_access(course, activity, user, db_session):
    access = await require_course_learning_access(course, user, db_session)
    if access != "staff" and not activity.published:
        raise HTTPException(404, "Lesson not found")
    return access
