import { pool } from "../db/pool";
import { EventCreate, EventRow, EventStats } from "../models/types";

export async function bulkUpsert(events: EventCreate[]): Promise<number> {
  if (events.length === 0) return 0;

  const client = await pool.connect();
  let newCount = 0;

  try {
    await client.query("BEGIN");

    for (const e of events) {
      const result = await client.query(
        `INSERT INTO events (source, source_id, event_type, sub_event_type, title, description, url,
          location, location_name, country, region, event_date, fatalities, actors, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7,
          ST_SetSRID(ST_MakePoint($8, $9), 4326), $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (source, source_id) DO NOTHING`,
        [
          e.source,
          e.source_id,
          e.event_type,
          e.sub_event_type || null,
          e.title,
          e.description || null,
          e.url || null,
          e.longitude,
          e.latitude,
          e.location_name || null,
          e.country || null,
          e.region || null,
          e.event_date,
          e.fatalities || 0,
          e.actors || null,
          e.tags || null,
        ]
      );
      if (result.rowCount && result.rowCount > 0) newCount++;
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return newCount;
}

interface QueryParams {
  bbox?: string;
  event_type?: string;
  country?: string;
  source?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export async function getEvents(
  params: QueryParams
): Promise<{ items: EventRow[]; total: number }> {
  const conditions: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (params.bbox) {
    const [minLon, minLat, maxLon, maxLat] = params.bbox.split(",").map(Number);
    conditions.push(
      `ST_Within(location, ST_MakeEnvelope($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, 4326))`
    );
    values.push(minLon, minLat, maxLon, maxLat);
    idx += 4;
  }

  if (params.event_type) {
    conditions.push(`event_type = $${idx}`);
    values.push(params.event_type);
    idx++;
  }

  if (params.country) {
    conditions.push(`country ILIKE $${idx}`);
    values.push(`%${params.country}%`);
    idx++;
  }

  if (params.source) {
    conditions.push(`source = $${idx}`);
    values.push(params.source);
    idx++;
  }

  if (params.date_from) {
    conditions.push(`event_date >= $${idx}`);
    values.push(params.date_from);
    idx++;
  }

  if (params.date_to) {
    conditions.push(`event_date <= $${idx}`);
    values.push(params.date_to);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(params.limit || 200, 1000);
  const offset = params.offset || 0;

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM events ${where}`,
    values
  );
  const total = parseInt(countResult.rows[0].count);

  const result = await pool.query(
    `SELECT id, source, source_id, event_type, sub_event_type, title, description, url,
      ST_Y(location) as latitude, ST_X(location) as longitude,
      location_name, country, region, event_date, scraped_at, fatalities, actors, tags
    FROM events ${where}
    ORDER BY event_date DESC
    LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, limit, offset]
  );

  return { items: result.rows, total };
}

export async function getEventById(id: string): Promise<EventRow | null> {
  const result = await pool.query(
    `SELECT id, source, source_id, event_type, sub_event_type, title, description, url,
      ST_Y(location) as latitude, ST_X(location) as longitude,
      location_name, country, region, event_date, scraped_at, fatalities, actors, tags
    FROM events WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getStats(): Promise<EventStats> {
  const totalResult = await pool.query("SELECT COUNT(*) FROM events");
  const recentResult = await pool.query(
    "SELECT COUNT(*) FROM events WHERE event_date >= NOW() - INTERVAL '24 hours'"
  );

  const byTypeResult = await pool.query(
    "SELECT event_type, COUNT(*) as count FROM events GROUP BY event_type"
  );
  const bySourceResult = await pool.query(
    "SELECT source, COUNT(*) as count FROM events GROUP BY source"
  );

  const by_type: Record<string, number> = {};
  byTypeResult.rows.forEach((r: any) => (by_type[r.event_type] = parseInt(r.count)));

  const by_source: Record<string, number> = {};
  bySourceResult.rows.forEach((r: any) => (by_source[r.source] = parseInt(r.count)));

  return {
    total_events: parseInt(totalResult.rows[0].count),
    events_24h: parseInt(recentResult.rows[0].count),
    by_type,
    by_source,
  };
}
