from src.db.trail_runs import StatusEnum


def learning_progress_status(status: StatusEnum, total: int, completed: int) -> StatusEnum:
    if status in (StatusEnum.STATUS_CANCELLED, StatusEnum.STATUS_PAUSED):
        return status
    return (StatusEnum.STATUS_COMPLETED if total > 0 and completed >= total
            else StatusEnum.STATUS_IN_PROGRESS)
