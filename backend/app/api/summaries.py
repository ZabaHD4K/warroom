from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.summary import SummaryRead, SummaryRequest
from app.services import event_service, summary_service
from app.utils.geo import parse_bbox

router = APIRouter(prefix="/summaries", tags=["summaries"])


@router.post("/generate", response_model=SummaryRead)
async def generate_summary(
    request: SummaryRequest,
    db: AsyncSession = Depends(get_db),
):
    # Get events either by IDs or by bbox + date range
    if request.event_ids:
        events = []
        for eid in request.event_ids:
            ev = await event_service.get_event_by_id(db, eid)
            if ev:
                events.append(ev)
    elif request.bbox:
        try:
            bbox_tuple = parse_bbox(request.bbox)
        except ValueError:
            raise HTTPException(400, "Invalid bbox format")
        events, _ = await event_service.get_events(
            db,
            bbox=bbox_tuple,
            date_from=request.date_from,
            date_to=request.date_to,
            limit=50,
        )
    else:
        raise HTTPException(400, "Provide event_ids or bbox")

    if not events:
        raise HTTPException(404, "No events found for the given criteria")

    summary = await summary_service.generate_summary(db, events)
    if not summary:
        raise HTTPException(500, "Failed to generate summary")

    return summary
