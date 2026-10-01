from datetime import datetime
from decimal import Decimal
from typing import Annotated, Any, Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field, field_validator

from src.core.events.database import get_db_session
from src.security.auth import get_current_user
from sqlmodel.ext.asyncio.session import AsyncSession

from src.security.features_utils.dependencies import require_courses_feature
from src.services.courses import learning

LearningUser = Annotated[Any, Depends(get_current_user)]
LearningDatabase = Annotated[AsyncSession, Depends(get_db_session)]


class LearningSettings(BaseModel):
    duration_months: Literal[4, 6, 12] = 4
    lessons_per_month: int = Field(default=12, ge=1, le=62)
    price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    currency: Literal["KGS", "USD", "RUB"] = "KGS"
    timezone: str = "Asia/Bishkek"

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value):
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("Unknown timezone")
        return value


class LessonInput(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    month: int = Field(default=1, ge=1, le=12)
    chapter_id: int | None = Field(default=None, gt=0)
    scheduled_at: datetime | None = None
    duration_minutes: int = Field(default=90, ge=15, le=480)
    location: str = Field(default="", max_length=300)
    published: bool = True

    @field_validator("name")
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError("Lesson name is required")
        return value.strip()

    @field_validator("scheduled_at")
    @classmethod
    def aware_datetime(cls, value):
        if value and (value.tzinfo is None or value.utcoffset() is None):
            raise ValueError("Lesson date must include a timezone")
        return value


class AttendanceInput(BaseModel):
    status: Literal["present", "absent", "excused"]
    grade: int | None = Field(default=None, ge=0, le=100)
    note: str = Field(default="", max_length=1000)


class EnrollmentDecision(BaseModel):
    status: Literal["approved", "rejected"]


router = APIRouter(dependencies=[Depends(require_courses_feature)])
admin_router = APIRouter(dependencies=[Depends(require_courses_feature)])


@admin_router.get("/{org_slug}/applications")
async def integration_applications(org_slug: str, user: LearningUser, db: LearningDatabase):
    from src.services.admin.admin import _require_api_token, _resolve_org_slug
    token = _require_api_token(user)
    await _resolve_org_slug(org_slug, token, db)
    return await learning.list_requests(token.org_id, token, db)


@admin_router.put("/{org_slug}/applications/{application_id}")
async def integration_decision(org_slug: str, application_id: int, payload: EnrollmentDecision,
                               user: LearningUser, db: LearningDatabase):
    from src.services.admin.admin import _require_api_token, _resolve_org_slug
    token = _require_api_token(user)
    await _resolve_org_slug(org_slug, token, db)
    return await learning.decide_request(application_id, payload.status, token, db)


@router.post("/courses/{course_uuid}/applications")
async def apply(request: Request, course_uuid: str, user: LearningUser, db: LearningDatabase):
    return await learning.request_enrollment(request, course_uuid, user, db)


@router.get("/orgs/{org_id}/applications")
async def applications(org_id: int, user: LearningUser, db: LearningDatabase):
    return await learning.list_requests(org_id, user, db)


@router.get("/orgs/{org_id}/calendar")
async def calendar(org_id: int, user: LearningUser, db: LearningDatabase):
    return await learning.lesson_calendar(org_id, user, db)


@router.put("/applications/{application_id}")
async def decide(application_id: int, payload: EnrollmentDecision, user: LearningUser, db: LearningDatabase):
    return await learning.decide_request(application_id, payload.status, user, db)


@router.get("/courses/{course_uuid}/journal")
async def journal(request: Request, course_uuid: str, user: LearningUser, db: LearningDatabase):
    return await learning.course_journal(request, course_uuid, user, db)


@router.get("/courses/{course_uuid}/my-journal")
async def personal_journal(course_uuid: str, user: LearningUser, db: LearningDatabase):
    return await learning.my_journal(course_uuid, user, db)


@router.put("/courses/{course_uuid}/lessons/{activity_uuid}/attendance/{student_id}")
async def attendance(request: Request, course_uuid: str, activity_uuid: str, student_id: int,
                     payload: AttendanceInput, user: LearningUser, db: LearningDatabase):
    return await learning.mark_attendance(request, course_uuid, activity_uuid, student_id, payload, user, db)


@router.put("/courses/{course_uuid}/settings")
async def settings(request: Request, course_uuid: str, payload: LearningSettings,
                   user: LearningUser, db: LearningDatabase):
    return await learning.save_settings(request, course_uuid, payload, user, db)


@router.post("/courses/{course_uuid}/lessons")
async def add_lesson(request: Request, course_uuid: str, payload: LessonInput,
                     user: LearningUser, db: LearningDatabase):
    return await learning.save_lesson(request, course_uuid, payload, user, db)


@router.put("/courses/{course_uuid}/lessons/{activity_uuid}")
async def edit_lesson(request: Request, course_uuid: str, activity_uuid: str, payload: LessonInput,
                      user: LearningUser, db: LearningDatabase):
    return await learning.save_lesson(request, course_uuid, payload, user, db, activity_uuid)
