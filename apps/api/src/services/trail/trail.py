from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException, Request, status
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.db.courses.activities import Activity
from src.db.courses.courses import Course
from src.db.trail_runs import StatusEnum, TrailRun, TrailRunRead
from src.db.trail_steps import TrailStep
from src.db.trails import Trail, TrailCreate, TrailRead
from src.db.users import AnonymousUser, PublicUser
from src.services.courses.learning_progress import learning_progress_status
from src.services.trail.access import ensure_learner_identity


async def _build_trail_read(
    trail: Trail,
    trail_runs_raw: list[TrailRun],
    db_session: AsyncSession,
    user_id: int | None = None,
    with_course_info: bool = True,
) -> TrailRead:
    """Build a TrailRead with all nested data using batch queries instead of N+1 loops."""
    if not trail_runs_raw:
        return TrailRead(**trail.model_dump(), runs=[])

    trail_run_ids = [tr.id for tr in trail_runs_raw]
    course_ids = list({tr.course_id for tr in trail_runs_raw})


    course_map: dict[int, Course] = {}
    if course_ids:
        courses = (await db_session.execute(
            select(Course).where(Course.id.in_(course_ids))  # type: ignore
        )).scalars().all()
        course_map = {c.id: c for c in courses}


    course_total_steps_map: dict[int, int] = {}
    if with_course_info and course_ids:
        step_counts = (await db_session.execute(
            select(Activity.course_id, func.count(Activity.id))
            .where(Activity.course_id.in_(course_ids), Activity.published == True)
            .group_by(Activity.course_id)
        )).all()
        course_total_steps_map = {row[0]: row[1] for row in step_counts}


    steps_statement = select(TrailStep).join(Activity, Activity.id == TrailStep.activity_id).where(
        Activity.published == True,
        TrailStep.trailrun_id.in_(trail_run_ids)  # type: ignore
    )
    if user_id is not None:
        steps_statement = steps_statement.where(TrailStep.user_id == user_id)
    all_steps = (await db_session.execute(steps_statement)).scalars().all()


    steps_by_run: dict[int, list[TrailStep]] = {}
    for step in all_steps:
        steps_by_run.setdefault(step.trailrun_id, []).append(step)


    step_course_ids = list({s.course_id for s in all_steps} - set(course_map.keys()))
    if step_course_ids:
        extra_courses = (await db_session.execute(
            select(Course).where(Course.id.in_(step_course_ids))  # type: ignore
        )).scalars().all()
        for c in extra_courses:
            course_map[c.id] = c


    trail_runs = []
    for tr in trail_runs_raw:
        course = course_map.get(tr.course_id)
        run = TrailRunRead(
            **tr.model_dump(),
            course=course.model_dump() if course else {},
            steps=[],
            course_total_steps=course_total_steps_map.get(tr.course_id, 0) if with_course_info else 0,
        )


        for step in steps_by_run.get(tr.id, []):
            db_session.expunge(step)
            step.complete = step.complete and step.teacher_verified
            step_course = course_map.get(step.course_id)
            step.data = {**(step.data or {}), "course": step_course.model_dump() if step_course else None}
            run.steps.append(step)

        if with_course_info:
            completed = sum(step.complete for step in run.steps)
            run.status = learning_progress_status(run.status, run.course_total_steps, completed)
        trail_runs.append(run)

    return TrailRead(**trail.model_dump(), runs=trail_runs)


async def create_user_trail(
    request: Request,
    user: PublicUser | AnonymousUser,
    trail_object: TrailCreate,
    db_session: AsyncSession,
) -> Trail:
    if isinstance(user, AnonymousUser):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Anonymous users cannot access this endpoint",
        )

    await ensure_learner_identity(user, trail_object.org_id, db_session)

    statement = select(Trail).where(
        Trail.org_id == trail_object.org_id, Trail.user_id == user.id
    )
    trail = (await db_session.execute(statement)).scalars().first()

    if trail:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trail already exists",
        )

    trail = Trail.model_validate(trail_object)

    trail.creation_date = str(datetime.now())
    trail.update_date = str(datetime.now())
    trail.org_id = trail_object.org_id
    trail.user_id = user.id
    trail.trail_uuid = str(f"trail_{uuid4()}")


    db_session.add(trail)
    await db_session.commit()
    await db_session.refresh(trail)

    return trail


async def get_user_trails(
    request: Request,
    user: PublicUser | AnonymousUser,
    db_session: AsyncSession,
) -> TrailRead:
    if isinstance(user, AnonymousUser):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Anonymous users cannot access this endpoint",
        )

    statement = select(Trail).where(Trail.user_id == user.id)
    trail = (await db_session.execute(statement)).scalars().first()

    if not trail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Trail not found"
        )

    await ensure_learner_identity(user, trail.org_id, db_session)

    statement = select(TrailRun).where(TrailRun.trail_id == trail.id, TrailRun.status != StatusEnum.STATUS_CANCELLED)
    trail_runs_raw = (await db_session.execute(statement)).scalars().all()

    return await _build_trail_read(trail, list(trail_runs_raw), db_session)


async def check_trail_presence(
    org_id: int,
    user_id: int,
    request: Request,
    user: PublicUser,
    db_session: AsyncSession,
):
    await ensure_learner_identity(user, org_id, db_session)

    statement = select(Trail).where(Trail.org_id == org_id, Trail.user_id == user_id)
    trail = (await db_session.execute(statement)).scalars().first()

    if not trail:
        trail = await create_user_trail(
            request,
            user,
            TrailCreate(
                org_id=org_id,
                user_id=user.id,
            ),
            db_session,
        )
        return trail

    return trail


async def get_user_trail_with_orgid(
    request: Request, user: PublicUser | AnonymousUser, org_id: int, db_session: AsyncSession
) -> TrailRead:

    if isinstance(user, AnonymousUser):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Anonymous users cannot access this endpoint",
        )

    await ensure_learner_identity(user, org_id, db_session)

    trail = await check_trail_presence(
        org_id=org_id,
        user_id=user.id,
        request=request,
        user=user,
        db_session=db_session,
    )

    statement = select(TrailRun).where(TrailRun.trail_id == trail.id, TrailRun.status != StatusEnum.STATUS_CANCELLED)
    trail_runs_raw = (await db_session.execute(statement)).scalars().all()

    return await _build_trail_read(trail, list(trail_runs_raw), db_session)


async def add_activity_to_trail(
    request: Request,
    user: PublicUser | AnonymousUser,
    activity_uuid: str,
    db_session: AsyncSession,
) -> TrailRead:
    raise HTTPException(status_code=403, detail="Lesson completion is recorded by mentor attendance")


async def remove_activity_from_trail(
    request: Request,
    user: PublicUser | AnonymousUser,
    activity_uuid: str,
    db_session: AsyncSession,
) -> TrailRead:
    raise HTTPException(status_code=403, detail="Only a mentor can correct lesson attendance")


async def add_course_to_trail(
    request: Request,
    user: PublicUser | AnonymousUser,
    course_uuid: str,
    db_session: AsyncSession,
) -> TrailRead:
    from src.services.courses.learning import request_enrollment
    return await request_enrollment(request, course_uuid, user, db_session)


async def remove_course_from_trail(
    request: Request,
    user: PublicUser | AnonymousUser,
    course_uuid: str,
    db_session: AsyncSession,
) -> TrailRead:
    raise HTTPException(status_code=403, detail="Only an administrator can remove a course enrollment")
