import { config } from "../config";
import { EventCreate } from "../models/types";
import { bulkUpsert } from "../services/eventService";
import { broadcast } from "../services/broadcast";

const ACLED_BASE_URL = "https://api.acleddata.com/acled/read";

const EVENT_TYPE_MAP: Record<string, string> = {
  Battles: "battle",
  "Explosions/Remote violence": "explosion",
  "Violence against civilians": "violence_against_civilians",
  Protests: "protest",
  Riots: "riot",
  "Strategic developments": "strategic_development",
};

export async function scrapeAcled(daysBack = 7): Promise<number> {
  if (!config.acledApiKey || !config.acledEmail) {
    console.log("[acled] No API key configured, skipping");
    return 0;
  }

  console.log("[acled] Starting scrape...");
  const now = new Date();
  const from = new Date(now.getTime() - daysBack * 86400000);
  const dateFrom = from.toISOString().slice(0, 10);
  const dateTo = now.toISOString().slice(0, 10);

  const allData: any[] = [];
  let page = 1;

  while (true) {
    const url = new URL(ACLED_BASE_URL);
    url.searchParams.set("key", config.acledApiKey);
    url.searchParams.set("email", config.acledEmail);
    url.searchParams.set("event_date", `${dateFrom}|${dateTo}`);
    url.searchParams.set("event_date_where", "BETWEEN");
    url.searchParams.set("limit", "500");
    url.searchParams.set("page", String(page));

    let resp: Response;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        resp = await fetch(url.toString());
        if (resp.ok) break;
      } catch (e) {
        console.warn(`[acled] Attempt ${attempt + 1} failed:`, e);
        if (attempt === 2) throw e;
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
    }

    const body: any = await resp!.json();
    const data = body.data || [];
    if (data.length === 0) break;

    allData.push(...data);
    page++;
    if (data.length < 500) break;
  }

  console.log(`[acled] Fetched ${allData.length} raw items`);

  const events: EventCreate[] = [];
  for (const raw of allData) {
    const ev = normalizeAcled(raw);
    if (ev) events.push(ev);
  }

  console.log(`[acled] Normalized ${events.length} events`);
  const newCount = await bulkUpsert(events);
  console.log(`[acled] Inserted ${newCount} new events`);

  if (newCount > 0) {
    broadcast({ type: "scraper_update", source: "acled", new_events: newCount });
  }

  return newCount;
}

function normalizeAcled(raw: any): EventCreate | null {
  const lat = parseFloat(raw.latitude);
  const lon = parseFloat(raw.longitude);
  if (!lat || !lon || (lat === 0 && lon === 0)) return null;

  const rawType = raw.event_type || "";
  const eventType = EVENT_TYPE_MAP[rawType] || rawType.toLowerCase().replace(/ /g, "_");

  const actors: string[] = [];
  if (raw.actor1) actors.push(raw.actor1);
  if (raw.actor2) actors.push(raw.actor2);

  const eventDate = new Date(raw.event_date);
  if (isNaN(eventDate.getTime())) return null;

  const locationParts: string[] = [];
  if (raw.location) locationParts.push(raw.location);
  if (raw.admin1) locationParts.push(raw.admin1);

  return {
    source: "acled",
    source_id: String(raw.data_id),
    event_type: eventType,
    sub_event_type: raw.sub_event_type || undefined,
    title: `${raw.sub_event_type || rawType} in ${raw.location || "Unknown"}`.slice(0, 512),
    description: raw.notes || undefined,
    url: raw.source_url || undefined,
    latitude: lat,
    longitude: lon,
    location_name: locationParts.join(", ") || undefined,
    country: raw.country || undefined,
    region: raw.region || undefined,
    event_date: eventDate,
    fatalities: parseInt(raw.fatalities) || 0,
    actors: actors.length > 0 ? actors : undefined,
    tags: rawType ? [rawType] : undefined,
  };
}
