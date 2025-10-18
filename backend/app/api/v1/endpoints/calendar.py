from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr

from app.api.v1.deps import get_current_user
from app.models.user import User

router = APIRouter()


class Event(BaseModel):
    id: str
    summary: str
    start: datetime
    end: datetime
    location: str


class EventsResponse(BaseModel):
    items: list[Event]


def _mock_events(user: User, max_results: int) -> list[Event]:
    base_time = datetime(2025, 10, 20, 9, 0)
    events = []
    for idx in range(max_results):
        start = base_time + timedelta(days=idx)
        end = start + timedelta(hours=1)
        events.append(
            Event(
                id=f"evt_{idx + 1}_{user.email}",
                summary=f"Sample event #{idx + 1} for {user.email}",
                start=start,
                end=end,
                location="Online",
            )
        )
    return events


@router.get("/events", response_model=EventsResponse)
def list_events(max_results: int = 10, current_user: User = Depends(get_current_user)) -> EventsResponse:
    events = _mock_events(current_user, max_results)
    return EventsResponse(items=events)
