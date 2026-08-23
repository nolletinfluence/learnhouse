"""Router coverage for the read-only admin course curriculum endpoint."""

from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from src.core.events.database import get_db_session
from src.db.courses.activities import Activity, ActivitySubTypeEnum, ActivityTypeEnum
from src.db.courses.chapter_activities import ChapterActivity
from src.db.users import APITokenUser
from src.routers.admin import router as admin_router
from src.security.auth import get_current_user


@pytest.fixture
def api_token_user(org) -> APITokenUser:
    return APITokenUser(
        id=99,
        user_uuid="curriculum_api_token",
        username="curriculum_api_token",
        org_id=org.id,
        rights={
            "courses": {"action_read": True},
            "coursechapters": {"action_read": True},
            "activities": {"action_read": True},
        },
        token_name="curriculum-test-token",
        created_by_user_id=1,
    )


@pytest.fixture
def app(db, api_token_user):
    application = FastAPI()
    application.include_router(admin_router, prefix="/api/v1/admin")
    application.dependency_overrides[get_db_session] = lambda: db
    application.dependency_overrides[get_current_user] = lambda: api_token_user
    yield application
    application.dependency_overrides.clear()


@pytest.fixture
async def client(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as test_client:
        yield test_client


@pytest.mark.asyncio
async def test_course_curriculum_route_returns_ordered_read_only_payload(
    client, db, org, course, chapter, activity
):
    unpublished_activity = Activity(
        id=2,
        name="Unpublished activity",
        activity_type=ActivityTypeEnum.TYPE_DYNAMIC,
        activity_sub_type=ActivitySubTypeEnum.SUBTYPE_DYNAMIC_PAGE,
        content={"type": "doc", "content": []},
        published=False,
        org_id=org.id,
        course_id=course.id,
        activity_uuid="activity_unpublished",
        creation_date=str(datetime.now()),
        update_date=str(datetime.now()),
    )
    db.add(unpublished_activity)
    db.add(
        ChapterActivity(
            order=2,
            chapter_id=chapter.id,
            activity_id=unpublished_activity.id,
            course_id=course.id,
            org_id=org.id,
            creation_date=str(datetime.now()),
            update_date=str(datetime.now()),
        )
    )
    await db.commit()

    with patch("src.services.admin.admin.get_org_plan", new_callable=AsyncMock, return_value="pro"):
        response = await client.get(
            f"/api/v1/admin/{org.slug}/courses/{course.course_uuid}/curriculum"
        )

    assert response.status_code == 200
    assert response.json() == {
        "course_uuid": course.course_uuid,
        "course_name": "Test Course",
        "updated_at": course.update_date,
        "chapters": [
            {
                "chapter_uuid": chapter.chapter_uuid,
                "name": "Test Chapter",
                "order": 1,
                "activities": [
                    {
                        "activity_uuid": activity.activity_uuid,
                        "name": "Test Activity",
                        "activity_type": "TYPE_DYNAMIC",
                        "activity_sub_type": "SUBTYPE_DYNAMIC_PAGE",
                        "order": 1,
                        "published": True,
                    },
                    {
                        "activity_uuid": "activity_unpublished",
                        "name": "Unpublished activity",
                        "activity_type": "TYPE_DYNAMIC",
                        "activity_sub_type": "SUBTYPE_DYNAMIC_PAGE",
                        "order": 2,
                        "published": False,
                    },
                ],
            }
        ],
    }


@pytest.mark.asyncio
async def test_course_curriculum_route_allows_get_only(client, org, course):
    response = await client.post(
        f"/api/v1/admin/{org.slug}/courses/{course.course_uuid}/curriculum"
    )

    assert response.status_code == 405
