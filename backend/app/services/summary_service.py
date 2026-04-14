import logging
import uuid

import anthropic
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.summary import Summary
from app.schemas.event import EventRead
from app.utils.geo import make_point

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a military intelligence analyst. Given a set of conflict events,
produce a concise situation briefing in markdown format. Include:
- What happened (types of events, scale)
- Where (geographic concentration)
- Who is involved (actors, forces)
- Assessment (what it might mean, trends)

Be factual and cite the data provided. Keep it under 500 words."""

MODEL = "claude-sonnet-4-20250514"


async def generate_summary(
    db: AsyncSession, events: list[EventRead]
) -> Summary | None:
    if not events:
        return None

    if not settings.ANTHROPIC_API_KEY:
        logger.warning("No ANTHROPIC_API_KEY configured, skipping summary generation")
        return None

    # Build the events description for the prompt
    events_text = []
    for e in events[:30]:  # Limit to 30 events per summary
        actors_str = ", ".join(e.actors) if e.actors else "Unknown actors"
        events_text.append(
            f"- [{e.event_date.strftime('%Y-%m-%d')}] {e.event_type}: {e.title} "
            f"| Location: {e.location_name or 'Unknown'}, {e.country or 'Unknown'} "
            f"| Actors: {actors_str} | Fatalities: {e.fatalities} "
            f"| Source: {e.source}"
        )

    user_message = (
        f"Analyze these {len(events)} conflict events and produce a situation briefing:\n\n"
        + "\n".join(events_text)
    )

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        content = response.content[0].text
    except Exception as e:
        logger.error(f"Claude API error: {e}")
        return None

    # Calculate cluster centroid
    avg_lat = sum(e.latitude for e in events) / len(events)
    avg_lon = sum(e.longitude for e in events) / len(events)

    summary = Summary(
        id=uuid.uuid4(),
        title=f"Situation Briefing: {events[0].country or 'Multiple Regions'} ({len(events)} events)",
        content=content,
        event_count=len(events),
        center=make_point(avg_lon, avg_lat),
        event_ids=[e.id for e in events],
        model_used=MODEL,
    )

    db.add(summary)
    await db.commit()
    await db.refresh(summary)

    return summary
