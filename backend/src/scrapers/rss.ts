import { createHash } from "crypto";
import { EventCreate } from "../models/types";
import { bulkUpsert } from "../services/eventService";
import { broadcast } from "../services/broadcast";

const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  ukraine: [48.38, 31.17],
  russia: [61.52, 105.32],
  israel: [31.05, 34.85],
  gaza: [31.35, 34.31],
  palestine: [31.95, 35.23],
  syria: [34.8, 38.99],
  iraq: [33.22, 43.68],
  iran: [32.43, 53.69],
  yemen: [15.55, 48.52],
  sudan: [12.86, 30.22],
  myanmar: [21.91, 95.96],
  libya: [26.34, 17.23],
  somalia: [5.15, 46.2],
  afghanistan: [33.94, 67.71],
  pakistan: [30.38, 69.35],
  lebanon: [33.85, 35.86],
  mexico: [23.63, -102.55],
  colombia: [4.57, -74.3],
  ethiopia: [9.15, 40.49],
  mali: [17.57, -4.0],
  niger: [17.61, 8.08],
  "burkina faso": [12.24, -1.56],
  mozambique: [-18.67, 35.53],
  congo: [-4.04, 21.76],
  haiti: [18.97, -72.29],
  taiwan: [23.7, 120.96],
  china: [35.86, 104.2],
  "north korea": [40.34, 127.51],
  "south korea": [35.91, 127.77],
};

const DEFAULT_FEEDS = [
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
  "https://www.aljazeera.com/xml/rss/all.xml",
];

const CONFLICT_KEYWORDS = new Set([
  "war", "attack", "airstrike", "bombing", "military", "conflict",
  "strike", "explosion", "killed", "troops", "missile", "drone",
  "battle", "offensive", "shelling", "combat", "artillery", "casualties",
  "invasion", "siege", "clashes", "fighting", "soldier", "weapon",
  "assault", "hostage", "terrorist", "insurgent", "militia", "rebel",
  "ceasefire", "sanctions",
]);

function isConflictRelated(text: string): boolean {
  const lower = text.toLowerCase();
  for (const kw of CONFLICT_KEYWORDS) {
    if (lower.includes(kw)) return true;
  }
  return false;
}

function extractCountry(text: string): { name: string; coords: [number, number] } | null {
  const lower = text.toLowerCase();
  for (const [country, coords] of Object.entries(COUNTRY_CENTROIDS)) {
    if (lower.includes(country)) {
      return { name: country.charAt(0).toUpperCase() + country.slice(1), coords };
    }
  }
  return null;
}

// Simple RSS parser using fetch + regex (avoids heavy deps)
async function parseFeed(url: string): Promise<Array<{ title: string; link: string; description: string; pubDate: string }>> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "WarRoom/0.1" },
      signal: AbortSignal.timeout(15000),
    });
    const xml = await resp.text();

    const items: Array<{ title: string; link: string; description: string; pubDate: string }> = [];
    const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const getTag = (tag: string) => {
        const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
        return (m?.[1] || m?.[2] || "").trim();
      };
      items.push({
        title: getTag("title"),
        link: getTag("link"),
        description: getTag("description").replace(/<[^>]+>/g, ""),
        pubDate: getTag("pubDate"),
      });
    }

    return items;
  } catch (e) {
    console.warn(`[rss] Failed to fetch ${url}:`, e);
    return [];
  }
}

export async function scrapeRss(feedUrls = DEFAULT_FEEDS): Promise<number> {
  console.log("[rss] Starting scrape...");

  const allItems: Array<{ title: string; link: string; description: string; pubDate: string; feedUrl: string }> = [];

  for (const url of feedUrls) {
    const items = await parseFeed(url);
    for (const item of items) {
      allItems.push({ ...item, feedUrl: url });
    }
  }

  console.log(`[rss] Fetched ${allItems.length} total items`);

  const events: EventCreate[] = [];
  for (const item of allItems) {
    const fullText = `${item.title} ${item.description}`;

    if (!isConflictRelated(fullText)) continue;

    const geo = extractCountry(fullText);
    if (!geo) continue;

    const sourceId = createHash("md5").update(item.link).digest("hex");
    const eventDate = item.pubDate ? new Date(item.pubDate) : new Date();
    if (isNaN(eventDate.getTime())) continue;

    events.push({
      source: "rss",
      source_id: sourceId,
      event_type: "news_report",
      title: item.title.slice(0, 512),
      description: item.description?.slice(0, 2000) || undefined,
      url: item.link,
      latitude: geo.coords[0],
      longitude: geo.coords[1],
      location_name: geo.name,
      country: geo.name,
      event_date: eventDate,
      fatalities: 0,
      tags: ["rss"],
    });
  }

  console.log(`[rss] Normalized ${events.length} conflict-related events`);
  const newCount = await bulkUpsert(events);
  console.log(`[rss] Inserted ${newCount} new events`);

  if (newCount > 0) {
    broadcast({ type: "scraper_update", source: "rss", new_events: newCount });
  }

  return newCount;
}
