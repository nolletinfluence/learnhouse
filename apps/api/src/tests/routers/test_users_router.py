"""
Router tests for src/routers/users.py

Uses httpx AsyncClient with a minimal FastAPI app containing only the
users router. The id/uuid/username endpoints use get_authenticated_user
(not get_current_user), so both dependencies are overridden.

Service functions are patched at the router import level to isolate
from database queries and external dependencies (Redis, config, etc.).
"""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient

from src.core.events.database import get_db_session
from src.db.users import APITokenUser, SuperadminAPITokenUser, User, UserReadPublic
from src.routers.users import router as users_router
from src.security.auth import get_current_user, get_authenticated_user


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def app(db, admin_user):
    app = FastAPI()
    app.include_router(users_router, prefix="/api/v1/users")
    app.dependency_overrides[get_db_session] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: admin_user
    app.dependency_overrides[get_authenticated_user] = lambda: admin_user
    yield app
    app.dependency_overrides.clear()


@pytest.fixture
async def client(app):
    async with AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://test",
    ) as c:
        yield c


def _mock_user_public(**overrides) -> UserReadPublic:
    """Build a minimal UserReadPublic for mocked service returns."""
    data = dict(
        id=1,
        username="admin",
        first_name="Admin",
        last_name="User",
        email="admin@test.com",
        user_uuid="user_admin",
        email_verified=False,
        avatar_image="",
        bio="",
    )
    data.update(overrides)
    return UserReadPublic(**data)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestGetProfile:
    async def test_get_profile(self, client):
        """GET /profile returns the current user (injected via dependency override)."""
        response = await client.get("/api/v1/users/profile")

        assert response.status_code == 200
        body = response.json()
        assert "username" in body
        assert body["username"] == "admin"


class TestGlobalUserEmailSearch:
    async def test_superadmin_finds_exact_global_identity(self, app, client, admin_user):
        app.dependency_overrides[get_authenticated_user] = lambda: admin_user.model_copy(
            update={"is_superadmin": True}
        )

        response = await client.post(
            "/api/v1/users/global/email-search",
            json={"email": "ADMIN@test.com"},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 1
        assert len(body["items"]) == 1
        assert body["items"][0]["id"] == admin_user.id
        assert body["items"][0]["user_uuid"] == admin_user.user_uuid
        assert body["items"][0]["email"] == "admin@test.com"
        assert set(body) == {"items", "total"}
        assert set(body["items"][0]) == {"id", "user_uuid", "email", "username"}

    @pytest.mark.parametrize(
        "principal",
        [
            APITokenUser(id=10, org_id=1),
            SuperadminAPITokenUser(id=11, created_by_user_id=1),
        ],
        ids=["organization-api-token", "superadmin-api-token"],
    )
    async def test_api_token_principals_are_rejected_without_lookup(
        self, app, client, principal
    ):
        app.dependency_overrides[get_authenticated_user] = lambda: principal

        with patch(
            "src.routers.users.read_users_by_email_global",
            new_callable=AsyncMock,
        ) as search:
            response = await client.post(
                "/api/v1/users/global/email-search",
                json={"email": "admin@test.com"},
            )

        assert response.status_code == 403
        search.assert_not_awaited()

    async def test_non_superadmin_session_is_rejected_without_lookup(self, client):
        with patch(
            "src.routers.users.read_users_by_email_global",
            new_callable=AsyncMock,
        ) as search:
            response = await client.post(
                "/api/v1/users/global/email-search",
                json={"email": "admin@test.com"},
            )

        assert response.status_code == 403
        search.assert_not_awaited()

    async def test_unauthenticated_request_is_rejected_without_lookup(self, app, client):
        app.dependency_overrides.pop(get_authenticated_user)

        with patch(
            "src.routers.users.read_users_by_email_global",
            new_callable=AsyncMock,
        ) as search:
            response = await client.post(
                "/api/v1/users/global/email-search",
                json={"email": "admin@test.com"},
            )

        assert response.status_code == 401
        search.assert_not_awaited()

    async def test_unknown_request_fields_are_rejected(self, app, client, admin_user):
        app.dependency_overrides[get_authenticated_user] = lambda: admin_user.model_copy(
            update={"is_superadmin": True}
        )

        response = await client.post(
            "/api/v1/users/global/email-search",
            json={"email": "admin@test.com", "include_profile": True},
        )

        assert response.status_code == 422

    async def test_exact_search_returns_empty_for_nonmatching_email(
        self, app, client, admin_user
    ):
        app.dependency_overrides[get_authenticated_user] = lambda: admin_user.model_copy(
            update={"is_superadmin": True}
        )

        response = await client.post(
            "/api/v1/users/global/email-search",
            json={"email": "missing@test.com"},
        )

        assert response.status_code == 200
        assert response.json() == {"items": [], "total": 0}

    async def test_exact_search_is_case_insensitive_and_bounded_to_two(
        self, app, client, admin_user, db
    ):
        app.dependency_overrides[get_authenticated_user] = lambda: admin_user.model_copy(
            update={"is_superadmin": True}
        )
        for user_id, email in enumerate(
            ["DUPLICATE@test.com", "duplicate@TEST.com", "duplicate@test.com"],
            start=10,
        ):
            db.add(
                User(
                    id=user_id,
                    username=f"duplicate-{user_id}",
                    first_name="",
                    last_name="",
                    email=email,
                    password="unused",
                    user_uuid=f"user_duplicate_{user_id}",
                    creation_date="",
                    update_date="",
                )
            )
        await db.commit()

        response = await client.post(
            "/api/v1/users/global/email-search",
            json={"email": "duplicate@test.com"},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 2
        assert [item["id"] for item in body["items"]] == [10, 11]
        assert all(
            set(item) == {"id", "user_uuid", "email", "username"}
            for item in body["items"]
        )


class TestGetUserById:
    async def test_get_user_by_id(self, client):
        mock_user = _mock_user_public()
        with patch(
            "src.routers.users.read_user_by_id",
            new_callable=AsyncMock,
            return_value=mock_user,
        ):
            response = await client.get("/api/v1/users/id/1")

        assert response.status_code == 200
        body = response.json()
        assert "user_uuid" in body
        assert body["user_uuid"] == "user_admin"

    async def test_get_user_by_id_not_found(self, client):
        with patch(
            "src.routers.users.read_user_by_id",
            new_callable=AsyncMock,
            side_effect=HTTPException(status_code=404, detail="User not found"),
        ):
            response = await client.get("/api/v1/users/id/999")

        assert response.status_code == 404


class TestGetUserByUuid:
    async def test_get_user_by_uuid(self, client):
        mock_user = _mock_user_public()
        with patch(
            "src.routers.users.read_user_by_uuid",
            new_callable=AsyncMock,
            return_value=mock_user,
        ):
            response = await client.get("/api/v1/users/uuid/user_admin")

        assert response.status_code == 200
        body = response.json()
        assert body["user_uuid"] == "user_admin"

    async def test_get_user_by_uuid_not_found(self, client):
        with patch(
            "src.routers.users.read_user_by_uuid",
            new_callable=AsyncMock,
            side_effect=HTTPException(
                status_code=404, detail="User not found"
            ),
        ):
            response = await client.get("/api/v1/users/uuid/nonexistent")

        assert response.status_code == 404


class TestGetUserByUsername:
    async def test_get_user_by_username(self, client):
        mock_user = _mock_user_public()
        with patch(
            "src.routers.users.read_user_by_username",
            new_callable=AsyncMock,
            return_value=mock_user,
        ):
            response = await client.get("/api/v1/users/username/admin")

        assert response.status_code == 200
        body = response.json()
        assert body["username"] == "admin"

    async def test_get_user_by_username_not_found(self, client):
        with patch(
            "src.routers.users.read_user_by_username",
            new_callable=AsyncMock,
            side_effect=HTTPException(
                status_code=404, detail="User not found"
            ),
        ):
            response = await client.get("/api/v1/users/username/nonexistent")

        assert response.status_code == 404
