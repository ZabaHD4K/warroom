import logging
from abc import ABC, abstractmethod

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.event import EventCreate
from app.services.event_service import bulk_upsert

logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    source_name: str

    @abstractmethod
    async def fetch_raw(self) -> list[dict]:
        """Fetch raw data from the source."""

    @abstractmethod
    def normalize(self, raw: dict) -> EventCreate | None:
        """Convert a raw record into EventCreate. Return None to skip."""

    async def run(self, db: AsyncSession) -> int:
        """Full cycle: fetch → normalize → upsert. Returns count of new events."""
        logger.info(f"[{self.source_name}] Starting scrape...")
        raw_items = await self.fetch_raw()
        logger.info(f"[{self.source_name}] Fetched {len(raw_items)} raw items")

        events = []
        for item in raw_items:
            try:
                event = self.normalize(item)
                if event:
                    events.append(event)
            except Exception as e:
                logger.warning(f"[{self.source_name}] Failed to normalize item: {e}")

        logger.info(f"[{self.source_name}] Normalized {len(events)} events")
        new_count = await bulk_upsert(db, events)
        logger.info(f"[{self.source_name}] Inserted {new_count} new events")
        return new_count
