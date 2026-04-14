import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.event import EventList, EventRead, EventStats
from app.services import event_service
from app.utils.geo import parse_bbox

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=EventList)
async def list_events(
    bbox: str | None = Query(None, description="min_lon,min_lat,max_lon,max_lat"),
    event_type: str | None = None,
    country: str | None = None,
    source: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    bbox_tuple = None
    if bbox:
        try:
            bbox_tuple = parse_bbox(bbox)
        except ValueError:
            raise HTTPException(400, "Invalid bbox format. Use: min_lon,min_lat,max_lon,max_lat")

    events, total = await event_service.get_events(
        db,
        bbox=bbox_tuple,
        event_type=event_type,
        country=country,
        source=source,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )
    return EventList(items=events, total=total)


@router.get("/stats", response_model=EventStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    return await event_service.get_stats(db)


@router.get("/{event_id}", response_model=EventRead)
async def get_event(event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    event = await event_service.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    return event
