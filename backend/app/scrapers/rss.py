import hashlib
import logging
from datetime import datetime

import feedparser
import httpx

from app.schemas.event import EventCreate
from app.scrapers.base import BaseScraper

logger = logging.getLogger(__name__)

# Country name → approximate centroid coordinates
COUNTRY_CENTROIDS = {
    "ukraine": (48.38, 31.17),
    "russia": (61.52, 105.32),
    "israel": (31.05, 34.85),
    "gaza": (31.35, 34.31),
    "palestine": (31.95, 35.23),
    "syria": (34.80, 38.99),
    "iraq": (33.22, 43.68),
    "iran": (32.43, 53.69),
    "yemen": (15.55, 48.52),
    "sudan": (12.86, 30.22),
    "myanmar": (21.91, 95.96),
    "libya": (26.34, 17.23),
    "somalia": (5.15, 46.20),
    "afghanistan": (33.94, 67.71),
    "pakistan": (30.38, 69.35),
    "lebanon": (33.85, 35.86),
    "mexico": (23.63, -102.55),
    "colombia": (4.57, -74.30),
    "ethiopia": (9.15, 40.49),
    "mali": (17.57, -4.00),
    "niger": (17.61, 8.08),
    "burkina faso": (12.24, -1.56),
    "mozambique": (-18.67, 35.53),
    "congo": (-4.04, 21.76),
    "haiti": (18.97, -72.29),
    "taiwan": (23.70, 120.96),
    "china": (35.86, 104.20),
    "north korea": (40.34, 127.51),
    "south korea": (35.91, 127.77),
}

DEFAULT_FEEDS = [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    "https://www.aljazeera.com/xml/rss/all.xml",
]

CONFLICT_KEYWORDS = {
    "war",
    "attack",
    "airstrike",
    "bombing",
    "military",
    "conflict",
    "strike",
    "explosion",
    "killed",
    "troops",
    "missile",
    "drone",
    "battle",
    "offensive",
    "shelling",
    "combat",
    "artillery",
    "casualties",
    "invasion",
    "siege",
    "clashes",
    "fighting",
    "soldier",
    "weapon",
    "assault",
    "hostage",
    "terrorist",
    "insurgent",
    "militia",
    "rebel",
    "ceasefire",
    "sanctions",
}


class RssScraper(BaseScraper):
    source_name = "rss"

    def __init__(self, feed_urls: list[str] | None = None):
        self.feed_urls = feed_urls or DEFAULT_FEEDS

    async def fetch_raw(self) -> list[dict]:
        items = []
        async with httpx.AsyncClient(timeout=30) as client:
            for url in self.feed_urls:
                try:
                    resp = await client.get(url, follow_redirects=True)
                    resp.raise_for_status()
                    feed = feedparser.parse(resp.text)
                    for entry in feed.entries:
                        items.append(
                            {"entry": entry, "feed_url": url, "feed_title": feed.feed.get("title", "")}
                        )
                except Exception as e:
                    logger.warning(f"[rss] Failed to fetch {url}: {e}")
        return items

    def _is_conflict_related(self, text: str) -> bool:
        text_lower = text.lower()
        return any(kw in text_lower for kw in CONFLICT_KEYWORDS)

    def _extract_country(self, text: str) -> tuple[str | None, tuple[float, float] | None]:
        text_lower = text.lower()
        for country, coords in COUNTRY_CENTROIDS.items():
            if country in text_lower:
                return country.title(), coords
        return None, None

    def normalize(self, raw: dict) -> EventCreate | None:
        entry = raw["entry"]
        title = entry.get("title", "")
        summary = entry.get("summary", "")
        full_text = f"{title} {summary}"

        if not self._is_conflict_related(full_text):
            return None

        country, coords = self._extract_country(full_text)
        if not coords:
            return None

        link = entry.get("link", "")
        source_id = hashlib.md5(link.encode()).hexdigest()

        published = entry.get("published_parsed") or entry.get("updated_parsed")
        if published:
            event_date = datetime(*published[:6])
        else:
            event_date = datetime.utcnow()

        return EventCreate(
            source="rss",
            source_id=source_id,
            event_type="news_report",
            sub_event_type=None,
            title=title[:512],
            description=summary[:2000] if summary else None,
            url=link,
            latitude=coords[0],
            longitude=coords[1],
            location_name=country,
            country=country,
            region=None,
            event_date=event_date,
            fatalities=0,
            actors=None,
            tags=["rss", raw.get("feed_title", "")][:2] if raw.get("feed_title") else ["rss"],
        )
