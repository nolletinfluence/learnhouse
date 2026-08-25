from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.db.user_organizations import UserOrganization
from src.security.rbac.constants import ADMIN_OR_MAINTAINER_ROLE_IDS


def management_identity_denial() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "code": "MANAGEMENT_IDENTITY_CANNOT_LEARN",
            "message": "Management identities can preview courses without learner progress.",
        },
    )


async def ensure_learner_identity(
    user,
    org_id: int,
    db_session: AsyncSession,
) -> None:
    if getattr(user, "is_superadmin", False):
        raise management_identity_denial()

    membership = (await db_session.execute(
        select(UserOrganization).where(
            UserOrganization.user_id == user.id,
            UserOrganization.org_id == org_id,
        )
    )).scalars().first()
    if membership and membership.role_id in ADMIN_OR_MAINTAINER_ROLE_IDS:
        raise management_identity_denial()
