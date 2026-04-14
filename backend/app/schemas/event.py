import uuid
from datetime import datetime

from pydantic import BaseModel


class EventCreate(BaseModel):
    source: str
    source_id: str
    event_type: str
    sub_event_type: str | None = None
    title: str
    description: str | None = None
    url: str | None = None
    latitude: float
    longitude: float
    location_name: str | None = None
    country: str | None = None
    region: str | None = None
    event_date: datetime
    fatalities: int = 0
    actors: list[str] | None = None
    tags: list[str] | None = None


class EventRead(BaseModel):
    id: uuid.UUID
    source: str
    source_id: str
    event_type: str
    sub_event_type: str | None
    title: str
    description: str | None
    url: str | None
    latitude: float
    longitude: float
    location_name: str | None
    country: str | None
    region: str | None
    event_date: datetime
    scraped_at: datetime
    fatalities: int
    actors: list[str] | None
    tags: list[str] | None

    model_config = {"from_attributes": True}


class EventList(BaseModel):
    items: list[EventRead]
    total: int


class EventStats(BaseModel):
    total_events: int
    events_24h: int
    by_type: dict[str, int]
    by_source: dict[str, int]
