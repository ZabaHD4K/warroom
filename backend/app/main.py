import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router, ws_api_router
from app.core.database import init_db
from app.core.scheduler import create_scheduler, run_acled, run_gdelt, run_rss

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing database...")
    await init_db()

    logger.info("Starting scheduler...")
    scheduler = create_scheduler()
    scheduler.start()

    # Run all scrapers once on startup
    logger.info("Running initial scrape...")
    await run_gdelt()
    await run_rss()
    # ACLED only if API key is configured
    from app.core.config import settings

    if settings.ACLED_API_KEY:
        await run_acled()
    else:
        logger.warning("ACLED_API_KEY not set, skipping ACLED scraper")

    logger.info("War Room backend ready.")
    yield

    # Shutdown
    scheduler.shutdown()
    logger.info("Scheduler stopped.")


app = FastAPI(
    title="War Room",
    description="Real-time OSINT conflict dashboard API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(ws_api_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
