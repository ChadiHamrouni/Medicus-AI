from datetime import datetime


def to_datetime(dt):
    if isinstance(dt, str):
        return datetime.fromisoformat(dt)
    return dt