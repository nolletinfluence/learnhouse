from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlmodel import select

from src.db.courses.learning import EnrollmentRequest, LessonAttendance
from src.db.resource_authors import (
    ResourceAuthor,
    ResourceAuthorshipEnum,
    ResourceAuthorshipStatusEnum,
)
from src.db.trail_runs import StatusEnum, TrailRun
from src.db.trail_steps import TrailStep
from src.db.users import APITokenUser
from src.routers.content_files import _check_content_access as stored_file_access
from src.routers.courses.learning import AttendanceInput, LearningSettings, LessonInput
from src.routers.local_content import _check_content_access as local_file_access
from src.services.courses.activities.activities import get_activity, get_activityby_id
from src.services.courses.activities.assignments import (
    create_assignment_submission,
    read_assignment,
)
from src.services.courses.chapters import get_chapter, get_course_chapters
from src.services.courses.learning import (
    course_journal,
    decide_request,
    lesson_calendar,
    list_requests,
    mark_attendance,
    my_journal,
    request_enrollment,
    save_lesson,
    save_settings,
)
from src.services.courses.learning_access import course_learning_access
from src.services.trail.trail import (
    add_activity_to_trail,
    remove_activity_from_trail,
    remove_course_from_trail,
)


async def approve(db, course, user, admin, request):
    await request_enrollment(request, course.course_uuid, user, db)
    application = (await db.execute(select(EnrollmentRequest))).scalars().first()
    await decide_request(application.id, "approved", admin, db)
    return application


@pytest.mark.parametrize("guest", [True, False])
async def test_public_course_does_not_expose_lessons_before_enrollment(db, course, activity, regular_user, anonymous_user, mock_request, guest):
    user = anonymous_user if guest else regular_user
    assert await get_course_chapters(mock_request, course.id, db, user, True) == []
    for read in (get_activity, get_activityby_id):
        with pytest.raises(HTTPException) as error:
            await read(mock_request, activity.activity_uuid if read is get_activity else activity.id, user, db)
        assert error.value.status_code == (401 if guest else 403)
    for access in (local_file_access, stored_file_access):
        with pytest.raises(HTTPException):
            await access(f"orgs/org_test/courses/{course.course_uuid}/activities/{activity.activity_uuid}/file.pdf", user, db, mock_request)


async def test_application_is_idempotent_and_requires_admin_approval(db, course, activity, regular_user, admin_user, mock_request):
    assert await request_enrollment(mock_request, course.course_uuid, regular_user, db) == {"status": "pending"}
    assert await request_enrollment(mock_request, course.course_uuid, regular_user, db) == {"status": "pending"}
    assert not (await db.execute(select(TrailRun))).scalars().all()
    assert len((await db.execute(select(EnrollmentRequest))).scalars().all()) == 1
    application = (await list_requests(course.org_id, admin_user, db))[0]
    with pytest.raises(HTTPException) as denied:
        await decide_request(application["id"], "approved", regular_user, db)
    assert denied.value.status_code == 403
    await decide_request(application["id"], "approved", admin_user, db)
    assert await course_learning_access(course, regular_user, db) == "enrolled"
    assert (await get_activity(mock_request, activity.activity_uuid, regular_user, db)).id == activity.id
    with pytest.raises(HTTPException) as conflict:
        await decide_request(application["id"], "approved", admin_user, db)
    assert conflict.value.status_code == 409


async def test_rejected_application_can_be_resubmitted_and_cross_org_token_cannot_approve(db, course, regular_user, admin_user, mock_request):
    await request_enrollment(mock_request, course.course_uuid, regular_user, db)
    application = (await db.execute(select(EnrollmentRequest))).scalars().first()
    await decide_request(application.id, "rejected", admin_user, db)
    assert await course_learning_access(course, regular_user, db) == "rejected"
    await request_enrollment(mock_request, course.course_uuid, regular_user, db)
    assert application.status == "pending"
    with pytest.raises(HTTPException) as denied:
        await decide_request(application.id, "approved", APITokenUser(org_id=999), db)
    assert denied.value.status_code == 403


async def test_enrolled_private_course_is_readable_but_draft_lesson_is_not(db, course, activity, regular_user, admin_user, mock_request):
    await approve(db, course, regular_user, admin_user, mock_request)
    course.public = False
    activity.published = False
    db.add(course)
    db.add(activity)
    await db.commit()
    assert (await get_course_chapters(mock_request, course.id, db, regular_user, True))[0].activities == []
    assert (await get_chapter(mock_request, activity.course_id, regular_user, db)).activities == []
    with pytest.raises(HTTPException) as denied:
        await get_activityby_id(mock_request, activity.id, regular_user, db)
    assert denied.value.status_code == 404
    assert (await get_activity(mock_request, activity.activity_uuid, admin_user, db)).id == activity.id
    course.published = False
    db.add(course)
    await db.commit()
    assert await course_learning_access(course, regular_user, db) == "unavailable"


async def test_attendance_and_grade_can_be_corrected_without_duplicate_steps(db, course, activity, regular_user, admin_user, mock_request):
    await approve(db, course, regular_user, admin_user, mock_request)
    for status, grade, complete in [("present", 0, True), ("absent", 75, False), ("excused", None, False), ("present", 100, True)]:
        result = await mark_attendance(mock_request, course.course_uuid, activity.activity_uuid, regular_user.id,
                                      AttendanceInput(status=status, grade=grade, note="Проверено"), admin_user, db)
        assert result["grade"] == grade
        steps = (await db.execute(select(TrailStep))).scalars().all()
        assert len(steps) == 1 and steps[0].complete is complete and steps[0].teacher_verified
        run = (await db.execute(select(TrailRun))).scalars().first()
        assert run.status == (StatusEnum.STATUS_COMPLETED if complete else StatusEnum.STATUS_IN_PROGRESS)
    assert len((await db.execute(select(LessonAttendance))).scalars().all()) == 1
    assert (await my_journal(course.course_uuid, regular_user, db))[0]["grade"] == 100
    assert (await course_journal(mock_request, course.course_uuid, admin_user, db))["students"][0]["id"] == regular_user.id
    with pytest.raises(HTTPException):
        await mark_attendance(mock_request, course.course_uuid, activity.activity_uuid, regular_user.id,
                              AttendanceInput(status="present"), regular_user, db)


@pytest.mark.parametrize("mutation", [add_activity_to_trail, remove_activity_from_trail, remove_course_from_trail])
async def test_student_cannot_complete_lesson_or_leave_course(db, course, regular_user, mock_request, mutation):
    with pytest.raises(HTTPException) as denied:
        await mutation(mock_request, regular_user, course.course_uuid, db)
    assert denied.value.status_code == 403


async def test_mentor_can_manage_assigned_course_but_not_approve_requests(db, course, activity, regular_user, mock_request):
    db.add(ResourceAuthor(resource_uuid=course.course_uuid, user_id=regular_user.id,
        authorship=ResourceAuthorshipEnum.CONTRIBUTOR, authorship_status=ResourceAuthorshipStatusEnum.ACTIVE,
        creation_date="2026-10-01", update_date="2026-10-01"))
    await db.commit()
    assert (await course_journal(mock_request, course.course_uuid, regular_user, db))["students"] == []
    with pytest.raises(HTTPException):
        await list_requests(course.org_id, regular_user, db)


async def test_schedule_is_visible_only_after_approval_and_keeps_timezone(db, course, regular_user, admin_user, mock_request):
    await save_settings(mock_request, course.course_uuid, LearningSettings(duration_months=6, price="12500.50"), admin_user, db)
    lesson = await save_lesson(mock_request, course.course_uuid, LessonInput(name=" HTML ", month=2,
        scheduled_at="2026-10-03T18:00:00+06:00", location="Аудитория 1"), admin_user, db)
    assert lesson["month"] == 2
    assert await lesson_calendar(course.org_id, regular_user, db) == []
    await approve(db, course, regular_user, admin_user, mock_request)
    calendar = await lesson_calendar(course.org_id, regular_user, db)
    assert calendar[0]["scheduled_at"] == "2026-10-03T18:00:00+06:00"
    assert calendar[0]["timezone"] == "Asia/Bishkek"
    chapters = await get_course_chapters(mock_request, course.id, db, regular_user, True, slim=True)
    assert chapters[0].activities[0].extra_metadata["bestdevs_lesson"]["month"] == 2


async def test_assignment_submission_does_not_enroll_or_change_attendance(db, course, assignment, regular_user, admin_user, mock_request):
    with pytest.raises(HTTPException):
        await read_assignment(mock_request, assignment.assignment_uuid, regular_user, db)
    with pytest.raises(HTTPException):
        await create_assignment_submission(mock_request, assignment.assignment_uuid, regular_user, db)
    assert not (await db.execute(select(TrailRun))).scalars().all()
    await approve(db, course, regular_user, admin_user, mock_request)
    with patch("src.services.courses.activities.assignments.record_audit_event", new_callable=AsyncMock), patch("src.services.courses.activities.assignments.track", new_callable=AsyncMock), patch("src.services.courses.activities.assignments.dispatch_webhooks", new_callable=AsyncMock):
        await create_assignment_submission(mock_request, assignment.assignment_uuid, regular_user, db)
    assert not (await db.execute(select(TrailStep))).scalars().all()


@pytest.mark.parametrize("model,payload", [(AttendanceInput,{"status":"present","grade":101}),
    (LearningSettings,{"duration_months":5}), (LearningSettings,{"price":-1}),
    (LearningSettings,{"timezone":"invalid"}), (LessonInput,{"name":"   "}),
    (LessonInput,{"name":"HTML","scheduled_at":"2026-10-03T18:00:00"})])
def test_school_input_validation(model,payload):
    with pytest.raises(ValidationError):
        model(**payload)

async def test_headless_course_access_and_assignment_list_follow_enrollment(db, course, assignment, regular_user, admin_user, mock_request):
    from src.services.admin.admin import check_course_access
    from src.services.courses.activities.assignments import get_assignments_from_course
    token = APITokenUser(org_id=course.org_id, created_by_user_id=admin_user.id,
                         rights={"courses": {"action_read": True}})
    assert not (await check_course_access(token, course.course_uuid, regular_user.id, db))["has_access"]
    await approve(db, course, regular_user, admin_user, mock_request)
    assert (await check_course_access(token, course.course_uuid, regular_user.id, db))["has_access"]
    assert len(await get_assignments_from_course(mock_request, course.course_uuid, regular_user, db)) == 1
    run = (await db.execute(select(TrailRun))).scalars().first()
    run.status = StatusEnum.STATUS_CANCELLED
    db.add(run)
    await db.commit()
    assert not (await check_course_access(token, course.course_uuid, regular_user.id, db))["has_access"]


async def test_legacy_self_completion_is_not_attendance_and_is_not_erased(db, course, activity, regular_user, admin_user, mock_request):
    from src.db.trails import Trail
    from src.services.trail.trail import _build_trail_read

    await approve(db, course, regular_user, admin_user, mock_request)
    run = (await db.execute(select(TrailRun))).scalars().first()
    trail = await db.get(Trail, run.trail_id)
    run.status = StatusEnum.STATUS_COMPLETED
    step = TrailStep(complete=True, teacher_verified=False, grade="", trailrun_id=run.id,
        trail_id=trail.id, activity_id=activity.id, course_id=course.id, org_id=course.org_id,
        user_id=regular_user.id, creation_date="now", update_date="now")
    db.add(run)
    db.add(step)
    await db.commit()
    response = await _build_trail_read(trail, [run], db)
    assert not response.runs[0].steps[0].complete
    assert response.runs[0].status == StatusEnum.STATUS_IN_PROGRESS
    assert (await db.get(TrailStep, step.id)).complete
