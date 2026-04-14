from fastapi import APIRouter

from app.api.events import router as events_router
from app.api.summaries import router as summaries_router
from app.api.ws import router as ws_router

api_router = APIRouter(prefix="/api")
api_router.include_router(events_router)
api_router.include_router(summaries_router)

# WebSocket router (no /api prefix)
ws_api_router = ws_router
