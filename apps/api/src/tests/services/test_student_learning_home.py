import pytest
from fastapi import HTTPException
from sqlmodel import select

from src.db.courses.chapter_activities import ChapterActivity
from src.db.courses.learning import EnrollmentRequest, LessonAttendance
from src.db.trail_runs import StatusEnum, TrailRun
from src.db.trail_steps import TrailStep
from src.db.users import APITokenUser
from src.routers.courses.learning import LessonInput
from src.services.courses.learning import decide_request, my_applications, open_lesson, request_enrollment, save_lesson
from src.services.trail.trail import get_user_trail_with_orgid


async def enroll(db, course, student, owner, request):
    await request_enrollment(request, course.course_uuid, student, db)
    application = (await db.execute(select(EnrollmentRequest))).scalars().first()
    await decide_request(application.id, "approved", owner, db)
    return (await db.execute(select(TrailRun))).scalars().first()


async def test_opening_lesson_remembers_position_without_awarding_credit(db, course, activity, regular_user, admin_user, mock_request):
    run = await enroll(db, course, regular_user, admin_user, mock_request)
    run.data = {"other_feature": {"keep": True}}
    db.add(run)
    await db.commit()
    for _ in range(2):
        result = await open_lesson(mock_request, course.course_uuid, activity.activity_uuid, regular_user, db)
        assert result == {"last_activity_uuid": activity.activity_uuid, "opened_activity_ids": [activity.id]}
    await db.refresh(run)
    assert run.data["other_feature"] == {"keep": True}
    assert run.data["bestdevs_learning"] == result
    assert run.status == StatusEnum.STATUS_IN_PROGRESS
    assert not (await db.execute(select(TrailStep))).scalars().all()
    assert not (await db.execute(select(LessonAttendance))).scalars().all()
    trail = await get_user_trail_with_orgid(mock_request, regular_user, course.org_id, db)
    assert trail.runs[0].data["bestdevs_learning"] == result
    assert trail.runs[0].lessons == [{"id": activity.id, "activity_uuid": activity.activity_uuid, "name": activity.name}]


async def test_home_lesson_outline_is_ordered_and_excludes_drafts_and_content(db, course, activity, regular_user, admin_user, mock_request):
    await enroll(db, course, regular_user, admin_user, mock_request)
    earlier = await save_lesson(mock_request, course.course_uuid, LessonInput(name="Earlier lesson", chapter_id=(await db.execute(select(ChapterActivity).where(ChapterActivity.activity_id == activity.id))).scalars().first().chapter_id), admin_user, db)
    await save_lesson(mock_request, course.course_uuid, LessonInput(name="Private draft", published=False), admin_user, db)
    link = (await db.execute(select(ChapterActivity).where(ChapterActivity.activity_id == earlier["id"]))).scalars().first()
    link.order = -1
    db.add(link)
    await db.commit()
    await open_lesson(mock_request, course.course_uuid, activity.activity_uuid, regular_user, db)
    result = await open_lesson(mock_request, course.course_uuid, earlier["activity_uuid"], regular_user, db)
    assert result["opened_activity_ids"] == sorted([activity.id, earlier["id"]])
    assert result["last_activity_uuid"] == earlier["activity_uuid"]
    trail = await get_user_trail_with_orgid(mock_request, regular_user, course.org_id, db)
    assert [lesson["name"] for lesson in trail.runs[0].lessons] == ["Earlier lesson", activity.name]
    assert trail.runs[0].course_total_steps == 2
    assert all(set(lesson) == {"id", "name", "activity_uuid"} for lesson in trail.runs[0].lessons)


@pytest.mark.parametrize("identity", ["anonymous", "token", "staff", "not_enrolled"])
async def test_open_position_requires_enrolled_student_identity(db, course, activity, regular_user, admin_user, anonymous_user, mock_request, identity):
    user = {"anonymous": anonymous_user, "staff": admin_user, "not_enrolled": regular_user,
            "token": APITokenUser(org_id=course.org_id, created_by_user_id=admin_user.id, rights={})}[identity]
    with pytest.raises(HTTPException) as denied:
        await open_lesson(mock_request, course.course_uuid, activity.activity_uuid, user, db)
    assert denied.value.status_code == (401 if identity in ("anonymous", "token") else 403)
    assert not (await db.execute(select(TrailRun))).scalars().all()


@pytest.mark.parametrize("unavailable", ["draft", "missing", "wrong_course", "cancelled", "unpublished_course"])
async def test_unavailable_lessons_cannot_replace_saved_position(db, course, activity, regular_user, admin_user, mock_request, unavailable):
    run = await enroll(db, course, regular_user, admin_user, mock_request)
    run.data = {"bestdevs_learning": {"last_activity_uuid": "activity_previous", "opened_activity_ids": []}}
    if unavailable == "draft":
        activity.published = False
    elif unavailable == "wrong_course":
        activity.course_id = None
    elif unavailable == "cancelled":
        run.status = StatusEnum.STATUS_CANCELLED
    elif unavailable == "unpublished_course":
        course.published = False
    db.add(run)
    db.add(activity)
    db.add(course)
    await db.commit()
    with pytest.raises(HTTPException) as denied:
        await open_lesson(mock_request, course.course_uuid,
                          "activity_missing" if unavailable == "missing" else activity.activity_uuid, regular_user, db)
    assert denied.value.status_code == (403 if unavailable in ("cancelled", "unpublished_course") else 404)
    await db.refresh(run)
    assert run.data["bestdevs_learning"]["last_activity_uuid"] == "activity_previous"


async def test_student_sees_only_own_pending_and_rejected_applications(db, course, regular_user, admin_user, mock_request):
    await request_enrollment(mock_request, course.course_uuid, regular_user, db)
    application = (await db.execute(select(EnrollmentRequest))).scalars().first()
    expected = {"course_uuid": course.course_uuid, "course_name": course.name, "status": "pending"}
    assert await my_applications(course.org_id, regular_user, db) == [expected]
    assert await my_applications(course.org_id, admin_user, db) == []
    await decide_request(application.id, "rejected", admin_user, db)
    assert await my_applications(course.org_id, regular_user, db) == [{**expected, "status": "rejected"}]
    course.published = False
    db.add(course)
    await db.commit()
    assert await my_applications(course.org_id, regular_user, db) == []
    with pytest.raises(HTTPException) as denied:
        await my_applications(course.org_id + 99, regular_user, db)
    assert denied.value.status_code == 403


async def test_approved_applications_leave_the_pending_list(db, course, regular_user, admin_user, mock_request):
    await enroll(db, course, regular_user, admin_user, mock_request)
    assert await my_applications(course.org_id, regular_user, db) == []
