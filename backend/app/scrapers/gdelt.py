import csv
import io
import logging
import zipfile
from datetime import datetime

import httpx

from app.schemas.event import EventCreate
from app.scrapers.base import BaseScraper

logger = logging.getLogger(__name__)

GDELT_LAST_UPDATE_URL = "http://data.gdeltproject.org/gdeltv2/lastupdate.txt"

# CAMEO root codes for conflict-related events
CONFLICT_ROOT_CODES = {"14", "17", "18", "19", "20"}

# CAMEO root code → event type mapping
CAMEO_TYPE_MAP = {
    "14": "protest",
    "17": "coercion",
    "18": "assault",
    "19": "fight",
    "20": "mass_violence",
}

# GDELT export CSV columns (fixed positions, no header)
COL_GLOBAL_EVENT_ID = 0
COL_DAY = 1
COL_ACTOR1_NAME = 6
COL_ACTOR2_NAME = 16
COL_EVENT_ROOT_CODE = 26
COL_EVENT_CODE = 27
COL_NUM_MENTIONS = 31
COL_NUM_SOURCES = 32
COL_AVG_TONE = 34
COL_ACTOR1_GEO_COUNTRY = 37
COL_ACTOR1_GEO_LAT = 39
COL_ACTOR1_GEO_LONG = 40
COL_ACTOR2_GEO_COUNTRY = 44
COL_ACTION_GEO_FULLNAME = 49
COL_ACTION_GEO_COUNTRY = 50
COL_ACTION_GEO_LAT = 53
COL_ACTION_GEO_LONG = 54
COL_SOURCE_URL = 57


class GdeltScraper(BaseScraper):
    source_name = "gdelt"

    async def fetch_raw(self) -> list[dict]:
        async with httpx.AsyncClient(timeout=60) as client:
            # Get the latest update file URL
            resp = await client.get(GDELT_LAST_UPDATE_URL)
            resp.raise_for_status()

            # First line contains the export CSV URL
            lines = resp.text.strip().split("\n")
            export_url = None
            for line in lines:
                parts = line.strip().split(" ")
                if len(parts) >= 3 and parts[2].endswith(".export.CSV.zip"):
                    export_url = parts[2]
                    break

            if not export_url:
                logger.error("[gdelt] Could not find export CSV URL")
                return []

            logger.info(f"[gdelt] Downloading {export_url}")
            resp = await client.get(export_url)
            resp.raise_for_status()

            # Unzip in memory and parse CSV
            with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
                csv_filename = zf.namelist()[0]
                with zf.open(csv_filename) as f:
                    text = f.read().decode("utf-8", errors="replace")

            rows = []
            reader = csv.reader(io.StringIO(text), delimiter="\t")
            for row in reader:
                if len(row) < 58:
                    continue

                root_code = row[COL_EVENT_ROOT_CODE]
                if root_code not in CONFLICT_ROOT_CODES:
                    continue

                lat = row[COL_ACTION_GEO_LAT].strip()
                lon = row[COL_ACTION_GEO_LONG].strip()
                if not lat or not lon:
                    continue

                rows.append(row)

            return rows

    def normalize(self, raw: list) -> EventCreate | None:
        try:
            lat = float(raw[COL_ACTION_GEO_LAT])
            lon = float(raw[COL_ACTION_GEO_LONG])
        except (ValueError, TypeError):
            return None

        if lat == 0 and lon == 0:
            return None

        root_code = raw[COL_EVENT_ROOT_CODE]
        event_type = CAMEO_TYPE_MAP.get(root_code, "conflict")

        day_str = raw[COL_DAY]
        try:
            event_date = datetime.strptime(day_str, "%Y%m%d")
        except ValueError:
            return None

        actors = []
        actor1 = raw[COL_ACTOR1_NAME].strip()
        actor2 = raw[COL_ACTOR2_NAME].strip()
        if actor1:
            actors.append(actor1)
        if actor2:
            actors.append(actor2)

        location_name = raw[COL_ACTION_GEO_FULLNAME].strip() or None
        country_code = raw[COL_ACTION_GEO_COUNTRY].strip() or None

        source_url = raw[COL_SOURCE_URL].strip() if len(raw) > COL_SOURCE_URL else None

        actor_desc = f" between {actor1} and {actor2}" if actor1 and actor2 else ""
        title = f"{event_type.replace('_', ' ').title()}{actor_desc} in {location_name or 'Unknown'}"

        return EventCreate(
            source="gdelt",
            source_id=raw[COL_GLOBAL_EVENT_ID],
            event_type=event_type,
            sub_event_type=raw[COL_EVENT_CODE],
            title=title[:512],
            description=None,
            url=source_url,
            latitude=lat,
            longitude=lon,
            location_name=location_name,
            country=country_code,
            region=None,
            event_date=event_date,
            fatalities=0,
            actors=actors if actors else None,
            tags=[f"cameo_{raw[COL_EVENT_CODE]}"] if raw[COL_EVENT_CODE] else None,
        )
