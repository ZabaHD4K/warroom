import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.config import settings
from app.core.database import async_session
from app.scrapers.acled import AcledScraper
from app.scrapers.gdelt import GdeltScraper
from app.scrapers.rss import RssScraper
from app.services.broadcast import manager

logger = logging.getLogger(__name__)


async def _run_scraper(scraper_cls, **kwargs):
    """Run a scraper and broadcast new events."""
    scraper = scraper_cls(**kwargs) if kwargs else scraper_cls()
    async with async_session() as db:
        try:
            new_count = await scraper.run(db)
            if new_count > 0:
                await manager.broadcast(
                    {
                        "type": "scraper_update",
                        "source": scraper.source_name,
                        "new_events": new_count,
                    }
                )
        except Exception as e:
            logger.error(f"Scraper {scraper.source_name} failed: {e}", exc_info=True)


async def run_acled():
    await _run_scraper(AcledScraper, days_back=7)


async def run_gdelt():
    await _run_scraper(GdeltScraper)


async def run_rss():
    await _run_scraper(RssScraper)


def create_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()

    scheduler.add_job(
        run_acled,
        "interval",
        hours=settings.SCRAPER_ACLED_INTERVAL_HOURS,
        id="acled_scraper",
        name="ACLED Scraper",
    )
    scheduler.add_job(
        run_gdelt,
        "interval",
        minutes=settings.SCRAPER_GDELT_INTERVAL_MINUTES,
        id="gdelt_scraper",
        name="GDELT Scraper",
    )
    scheduler.add_job(
        run_rss,
        "interval",
        hours=settings.SCRAPER_RSS_INTERVAL_HOURS,
        id="rss_scraper",
        name="RSS Scraper",
    )

    return scheduler
