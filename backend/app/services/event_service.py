import logging
from datetime import datetime, timedelta

from geoalchemy2.functions import ST_MakeEnvelope, ST_Within, ST_X, ST_Y
from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event
from app.schemas.event import EventCreate, EventRead
from app.utils.geo import make_point

logger = logging.getLogger(__name__)


def _event_to_read(event: Event, lat: float, lon: float) -> EventRead:
    return EventRead(
        id=event.id,
        source=event.source,
        source_id=event.source_id,
        event_type=event.event_type,
        sub_event_type=event.sub_event_type,
        title=event.title,
        description=event.description,
        url=event.url,
        latitude=lat,
        longitude=lon,
        location_name=event.location_name,
        country=event.country,
        region=event.region,
        event_date=event.event_date,
        scraped_at=event.scraped_at,
        fatalities=event.fatalities,
        actors=event.actors,
        tags=event.tags,
    )


async def bulk_upsert(db: AsyncSession, events: list[EventCreate]) -> int:
    """Insert events, skip duplicates (same source + source_id). Returns new count."""
    if not events:
        return 0

    new_count = 0
    for event in events:
        stmt = (
            insert(Event)
            .values(
                source=event.source,
                source_id=event.source_id,
                event_type=event.event_type,
                sub_event_type=event.sub_event_type,
                title=event.title,
                description=event.description,
                url=event.url,
                location=make_point(event.longitude, event.latitude),
                location_name=event.location_name,
                country=event.country,
                region=event.region,
                event_date=event.event_date,
                fatalities=event.fatalities,
                actors=event.actors,
                tags=event.tags,
            )
            .on_conflict_do_nothing(constraint="uq_source_event")
        )
        result = await db.execute(stmt)
        if result.rowcount > 0:
            new_count += 1

    await db.commit()
    return new_count


async def get_events(
    db: AsyncSession,
    bbox: tuple[float, float, float, float] | None = None,
    event_type: str | None = None,
    country: str | None = None,
    source: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    limit: int = 200,
    offset: int = 0,
) -> tuple[list[EventRead], int]:
    """Query events with filters. Returns (events, total_count)."""
    query = select(
        Event,
        ST_Y(Event.location).label("lat"),
        ST_X(Event.location).label("lon"),
    )
    count_query = select(func.count(Event.id))

    if bbox:
        envelope = ST_MakeEnvelope(bbox[0], bbox[1], bbox[2], bbox[3], 4326)
        query = query.where(ST_Within(Event.location, envelope))
        count_query = count_query.where(ST_Within(Event.location, envelope))

    if event_type:
        query = query.where(Event.event_type == event_type)
        count_query = count_query.where(Event.event_type == event_type)

    if country:
        query = query.where(Event.country.ilike(f"%{country}%"))
        count_query = count_query.where(Event.country.ilike(f"%{country}%"))

    if source:
        query = query.where(Event.source == source)
        count_query = count_query.where(Event.source == source)

    if date_from:
        query = query.where(Event.event_date >= date_from)
        count_query = count_query.where(Event.event_date >= date_from)

    if date_to:
        query = query.where(Event.event_date <= date_to)
        count_query = count_query.where(Event.event_date <= date_to)

    query = query.order_by(Event.event_date.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    rows = result.all()

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    events = [_event_to_read(row[0], row[1], row[2]) for row in rows]
    return events, total


async def get_event_by_id(db: AsyncSession, event_id) -> EventRead | None:
    query = select(
        Event,
        ST_Y(Event.location).label("lat"),
        ST_X(Event.location).label("lon"),
    ).where(Event.id == event_id)

    result = await db.execute(query)
    row = result.first()
    if not row:
        return None
    return _event_to_read(row[0], row[1], row[2])


async def get_stats(db: AsyncSession) -> dict:
    now = datetime.utcnow()
    day_ago = now - timedelta(hours=24)

    total = await db.execute(select(func.count(Event.id)))
    total_count = total.scalar() or 0

    recent = await db.execute(
        select(func.count(Event.id)).where(Event.event_date >= day_ago)
    )
    recent_count = recent.scalar() or 0

    by_type_result = await db.execute(
        select(Event.event_type, func.count(Event.id)).group_by(Event.event_type)
    )
    by_type = {row[0]: row[1] for row in by_type_result.all()}

    by_source_result = await db.execute(
        select(Event.source, func.count(Event.id)).group_by(Event.source)
    )
    by_source = {row[0]: row[1] for row in by_source_result.all()}

    return {
        "total_events": total_count,
        "events_24h": recent_count,
        "by_type": by_type,
        "by_source": by_source,
    }
