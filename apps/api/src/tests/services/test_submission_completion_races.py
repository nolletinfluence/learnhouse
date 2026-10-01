"""Assignment submission does not produce mentor attendance or course completion."""


from datetime import datetime

import pytest
from unittest.mock import AsyncMock, patch

from src.db.courses.assignments import (
    Assignment,
    GradingTypeEnum,
)
from src.db.trails import Trail
from src.services.courses.activities.assignments import create_assignment_submission

_A = "src.services.courses.activities.assignments."
_PATCH_RBAC = _A + "check_resource_access"
_PATCH_AUTH_ROLES = _A + "authorization_verify_based_on_roles"
_PATCH_DISPATCH = _A + "dispatch_webhooks"
_PATCH_TRACK = _A + "track"
_PATCH_CERT = _A + "check_course_completion_and_create_certificate"


async def _assignment(db, org, course, chapter, activity):
    a = Assignment(
        title="A", description="d", due_date="2999-01-01", published=True,
        grading_type=GradingTypeEnum.NUMERIC, auto_grading=False, org_id=org.id,
        course_id=course.id, chapter_id=chapter.id, activity_id=activity.id,
        assignment_uuid="assignment_races_test",
        creation_date=str(datetime.now()), update_date=str(datetime.now()),
    )
    db.add(a)
    await db.commit()
    await db.refresh(a)
    return a


async def _trail(db, course, user):
    t = Trail(
        org_id=course.org_id, user_id=user.id, trail_uuid=f"trail_races_{user.id}",
        creation_date=str(datetime.now()), update_date=str(datetime.now()),
    )
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return t


class TestAssignmentDoesNotCompleteCourse:
    @pytest.mark.asyncio
    async def test_final_assignment_submission_does_not_complete_course(
        self,
        mock_request,
        db,
        org,
        course,
        chapter,
        activity,
        regular_user,
        enrolled_student,
    ):
        assignment = await _assignment(db, org, course, chapter, activity)
        await _trail(db, course, regular_user)
        with (
            patch(_PATCH_RBAC, new_callable=AsyncMock),
            patch(_PATCH_AUTH_ROLES, new_callable=AsyncMock, return_value=False),
            patch(_PATCH_CERT, new_callable=AsyncMock),
            patch(_PATCH_TRACK, new_callable=AsyncMock) as mock_track,
            patch(_PATCH_DISPATCH, new_callable=AsyncMock) as mock_dispatch,
        ):
            await create_assignment_submission(
                mock_request, assignment.assignment_uuid, regular_user, db
            )
        dispatched = [c.kwargs.get("event_name") for c in mock_dispatch.await_args_list]
        tracked = [c.kwargs.get("event_name") for c in mock_track.await_args_list]
        assert "course_completed" not in dispatched
        assert "course_completed" not in tracked

    @pytest.mark.asyncio
    async def test_course_not_completed_does_not_fire_when_other_activity_incomplete(
        self,
        mock_request,
        db,
        org,
        course,
        chapter,
        activity,
        regular_user,
        enrolled_student,
    ):
        from src.db.courses.activities import (
            Activity,
            ActivityTypeEnum,
            ActivitySubTypeEnum,
        )
        from src.db.courses.chapter_activities import ChapterActivity

        other = Activity(
            id=8801,
            name="Other",
            activity_uuid="activity_other_8801",
            activity_type=ActivityTypeEnum.TYPE_DYNAMIC,
            activity_sub_type=ActivitySubTypeEnum.SUBTYPE_DYNAMIC_PAGE,
            published=True,
            org_id=org.id,
            course_id=course.id,
            content={},
            creation_date="2024-01-01",
            update_date="2024-01-01",
        )
        db.add(other)
        await db.commit()
        db.add(
            ChapterActivity(
                activity_id=other.id,
                course_id=course.id,
                chapter_id=chapter.id,
                org_id=org.id,
                order=2,
                creation_date=str(datetime.now()),
                update_date=str(datetime.now()),
            )
        )
        await db.commit()
        assignment = await _assignment(db, org, course, chapter, activity)
        await _trail(db, course, regular_user)
        with (
            patch(_PATCH_RBAC, new_callable=AsyncMock),
            patch(_PATCH_AUTH_ROLES, new_callable=AsyncMock, return_value=False),
            patch(_PATCH_CERT, new_callable=AsyncMock),
            patch(_PATCH_TRACK, new_callable=AsyncMock),
            patch(_PATCH_DISPATCH, new_callable=AsyncMock) as mock_dispatch,
        ):
            await create_assignment_submission(
                mock_request, assignment.assignment_uuid, regular_user, db
            )
        dispatched = [c.kwargs.get("event_name") for c in mock_dispatch.await_args_list]
        assert "course_completed" not in dispatched
