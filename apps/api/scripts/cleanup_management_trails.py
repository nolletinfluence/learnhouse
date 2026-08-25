import argparse
import asyncio
from pathlib import Path
import sys

from sqlalchemy import delete, text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.core.events.database import _async_session_factory, engine
from src.db.trail_runs import TrailRun
from src.db.trail_steps import TrailStep
from src.db.trails import Trail


TARGETS_SQL = text("""
    WITH management_memberships AS (
        SELECT user_id, org_id
        FROM userorganization
        WHERE role_id IN (1, 2)
        UNION
        SELECT trail.user_id, trail.org_id
        FROM trail
        JOIN "user" AS account ON account.id = trail.user_id
        WHERE account.is_superadmin = true
    )
    SELECT
        trail.id AS trail_id,
        trail.user_id,
        trail.org_id,
        count(DISTINCT trailrun.id) AS run_count,
        count(DISTINCT trailstep.id) AS step_count
    FROM trail
    JOIN management_memberships AS management
      ON management.user_id = trail.user_id
     AND management.org_id = trail.org_id
    LEFT JOIN trailrun ON trailrun.trail_id = trail.id
    LEFT JOIN trailstep ON trailstep.trail_id = trail.id
    GROUP BY trail.id, trail.user_id, trail.org_id
    ORDER BY trail.org_id, trail.user_id
""")


async def cleanup(apply: bool) -> int:
    async with _async_session_factory() as session:
        targets = (await session.exec(TARGETS_SQL)).mappings().all()
        total_runs = sum(int(target["run_count"]) for target in targets)
        total_steps = sum(int(target["step_count"]) for target in targets)
        print(
            f"mode={'apply' if apply else 'dry-run'} trails={len(targets)} "
            f"runs={total_runs} steps={total_steps}"
        )
        for target in targets:
            print(
                f"user_id={target['user_id']} org_id={target['org_id']} "
                f"trail_id={target['trail_id']} runs={target['run_count']} "
                f"steps={target['step_count']}"
            )

        if not apply or not targets:
            await session.rollback()
            return len(targets)

        trail_ids = [target["trail_id"] for target in targets]
        await session.exec(delete(TrailStep).where(TrailStep.trail_id.in_(trail_ids)))
        await session.exec(delete(TrailRun).where(TrailRun.trail_id.in_(trail_ids)))
        await session.exec(delete(Trail).where(Trail.id.in_(trail_ids)))
        await session.commit()
        print(
            f"committed trails={len(targets)} runs={total_runs} steps={total_steps}"
        )
        return len(targets)


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    try:
        await cleanup(args.apply)
        return 0
    finally:
        await engine.dispose()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
