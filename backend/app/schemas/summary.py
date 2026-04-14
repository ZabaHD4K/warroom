import uuid
from datetime import datetime

from pydantic import BaseModel


class SummaryRequest(BaseModel):
    event_ids: list[uuid.UUID] | None = None
    bbox: str | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None


class SummaryRead(BaseModel):
    id: uuid.UUID
    title: str
    content: str
    event_count: int
    generated_at: datetime
    model_used: str | None

    model_config = {"from_attributes": True}
