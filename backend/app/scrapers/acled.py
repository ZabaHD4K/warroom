import logging
from datetime import datetime, timedelta

import httpx

from app.core.config import settings
from app.schemas.event import EventCreate
from app.scrapers.base import BaseScraper

logger = logging.getLogger(__name__)

ACLED_BASE_URL = "https://api.acleddata.com/acled/read"

EVENT_TYPE_MAP = {
    "Battles": "battle",
    "Explosions/Remote violence": "explosion",
    "Violence against civilians": "violence_against_civilians",
    "Protests": "protest",
    "Riots": "riot",
    "Strategic developments": "strategic_development",
}


class AcledScraper(BaseScraper):
    source_name = "acled"

    def __init__(self, days_back: int = 7):
        self.days_back = days_back

    async def fetch_raw(self) -> list[dict]:
        date_from = (datetime.utcnow() - timedelta(days=self.days_back)).strftime(
            "%Y-%m-%d"
        )
        date_to = datetime.utcnow().strftime("%Y-%m-%d")

        all_data = []
        page = 1

        async with httpx.AsyncClient(timeout=60) as client:
            while True:
                params = {
                    "key": settings.ACLED_API_KEY,
                    "email": settings.ACLED_EMAIL,
                    "event_date": f"{date_from}|{date_to}",
                    "event_date_where": "BETWEEN",
                    "limit": 500,
                    "page": page,
                }

                for attempt in range(3):
                    try:
                        resp = await client.get(ACLED_BASE_URL, params=params)
                        resp.raise_for_status()
                        break
                    except httpx.HTTPError as e:
                        logger.warning(
                            f"[acled] HTTP error (attempt {attempt + 1}): {e}"
                        )
                        if attempt == 2:
                            raise

                body = resp.json()
                data = body.get("data", [])
                if not data:
                    break

                all_data.extend(data)
                page += 1

                if len(data) < 500:
                    break

        return all_data

    def normalize(self, raw: dict) -> EventCreate | None:
        lat = raw.get("latitude")
        lon = raw.get("longitude")
        if not lat or not lon:
            return None

        try:
            lat_f = float(lat)
            lon_f = float(lon)
        except (ValueError, TypeError):
            return None

        if lat_f == 0 and lon_f == 0:
            return None

        raw_type = raw.get("event_type", "")
        event_type = EVENT_TYPE_MAP.get(raw_type, raw_type.lower().replace(" ", "_"))

        actors = []
        if raw.get("actor1"):
            actors.append(raw["actor1"])
        if raw.get("actor2"):
            actors.append(raw["actor2"])

        fatalities = 0
        try:
            fatalities = int(raw.get("fatalities", 0))
        except (ValueError, TypeError):
            pass

        event_date_str = raw.get("event_date", "")
        try:
            event_date = datetime.strptime(event_date_str, "%Y-%m-%d")
        except ValueError:
            return None

        location_parts = []
        if raw.get("location"):
            location_parts.append(raw["location"])
        if raw.get("admin1"):
            location_parts.append(raw["admin1"])

        return EventCreate(
            source="acled",
            source_id=str(raw.get("data_id", "")),
            event_type=event_type,
            sub_event_type=raw.get("sub_event_type"),
            title=f"{raw.get('sub_event_type', raw_type)} in {raw.get('location', 'Unknown')}",
            description=raw.get("notes"),
            url=raw.get("source_url"),
            latitude=lat_f,
            longitude=lon_f,
            location_name=", ".join(location_parts) if location_parts else None,
            country=raw.get("country"),
            region=raw.get("region"),
            event_date=event_date,
            fatalities=fatalities,
            actors=actors if actors else None,
            tags=[raw_type] if raw_type else None,
        )
