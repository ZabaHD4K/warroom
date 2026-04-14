import { EventCreate } from "../models/types";
import { bulkUpsert } from "../services/eventService";
import { broadcast } from "../services/broadcast";

const GDELT_LAST_UPDATE_URL = "http://data.gdeltproject.org/gdeltv2/lastupdate.txt";

// CAMEO root codes for conflict events
const CONFLICT_ROOT_CODES = new Set(["14", "17", "18", "19", "20"]);

const CAMEO_TYPE_MAP: Record<string, string> = {
  "14": "protest",
  "17": "coercion",
  "18": "assault",
  "19": "fight",
  "20": "mass_violence",
};

// GDELT CSV column indexes (tab-separated, no header)
const COL = {
  GLOBAL_EVENT_ID: 0,
  DAY: 1,
  ACTOR1_NAME: 6,
  ACTOR2_NAME: 16,
  EVENT_ROOT_CODE: 26,
  EVENT_CODE: 27,
  ACTION_GEO_FULLNAME: 49,
  ACTION_GEO_COUNTRY: 50,
  ACTION_GEO_LAT: 53,
  ACTION_GEO_LONG: 54,
  SOURCE_URL: 57,
};

export async function scrapeGdelt(): Promise<number> {
  console.log("[gdelt] Starting scrape...");

  // Get latest update URL
  const updateResp = await fetch(GDELT_LAST_UPDATE_URL);
  const updateText = await updateResp.text();

  let exportUrl: string | null = null;
  for (const line of updateText.trim().split("\n")) {
    const parts = line.trim().split(" ");
    if (parts.length >= 3 && parts[2].endsWith(".export.CSV.zip")) {
      exportUrl = parts[2];
      break;
    }
  }

  if (!exportUrl) {
    console.error("[gdelt] Could not find export CSV URL");
    return 0;
  }

  console.log(`[gdelt] Downloading ${exportUrl}`);
  const csvResp = await fetch(exportUrl);
  const zipBuffer = await csvResp.arrayBuffer();

  // Decompress ZIP — use the built-in DecompressionStream approach
  // Since we're dealing with a ZIP file, we need a proper unzip
  const { Readable } = await import("stream");
  const { createUnzip } = await import("zlib");
  const { Parse } = await import("unzipper" as any).catch(() => null) || {};

  // Simpler approach: use AdmZip-style parsing or raw approach
  // Let's use a buffer-based approach
  let csvText: string;
  try {
    const AdmZip = (await import("adm-zip")).default;
    const zip = new AdmZip(Buffer.from(zipBuffer));
    const entries = zip.getEntries();
    csvText = entries[0].getData().toString("utf-8");
  } catch {
    // Fallback: try importing unzipper
    console.error("[gdelt] Could not unzip CSV. Install adm-zip: npm i adm-zip");
    return 0;
  }

  const lines = csvText.split("\n");
  const events: EventCreate[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split("\t");
    if (cols.length < 58) continue;

    const rootCode = cols[COL.EVENT_ROOT_CODE];
    if (!CONFLICT_ROOT_CODES.has(rootCode)) continue;

    const lat = parseFloat(cols[COL.ACTION_GEO_LAT]);
    const lon = parseFloat(cols[COL.ACTION_GEO_LONG]);
    if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) continue;

    const eventType = CAMEO_TYPE_MAP[rootCode] || "conflict";
    const dayStr = cols[COL.DAY];
    const eventDate = new Date(
      `${dayStr.slice(0, 4)}-${dayStr.slice(4, 6)}-${dayStr.slice(6, 8)}`
    );
    if (isNaN(eventDate.getTime())) continue;

    const actors: string[] = [];
    const actor1 = cols[COL.ACTOR1_NAME]?.trim();
    const actor2 = cols[COL.ACTOR2_NAME]?.trim();
    if (actor1) actors.push(actor1);
    if (actor2) actors.push(actor2);

    const locationName = cols[COL.ACTION_GEO_FULLNAME]?.trim() || undefined;
    const country = cols[COL.ACTION_GEO_COUNTRY]?.trim() || undefined;
    const sourceUrl = cols[COL.SOURCE_URL]?.trim() || undefined;

    const actorDesc =
      actor1 && actor2 ? ` between ${actor1} and ${actor2}` : "";
    const title =
      `${eventType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}${actorDesc} in ${locationName || "Unknown"}`.slice(
        0,
        512
      );

    events.push({
      source: "gdelt",
      source_id: cols[COL.GLOBAL_EVENT_ID],
      event_type: eventType,
      sub_event_type: cols[COL.EVENT_CODE] || undefined,
      title,
      url: sourceUrl,
      latitude: lat,
      longitude: lon,
      location_name: locationName,
      country,
      event_date: eventDate,
      fatalities: 0,
      actors: actors.length > 0 ? actors : undefined,
      tags: [`cameo_${cols[COL.EVENT_CODE]}`],
    });
  }

  console.log(`[gdelt] Parsed ${events.length} conflict events from ${lines.length} total rows`);
  const newCount = await bulkUpsert(events);
  console.log(`[gdelt] Inserted ${newCount} new events`);

  if (newCount > 0) {
    broadcast({ type: "scraper_update", source: "gdelt", new_events: newCount });
  }

  return newCount;
}
