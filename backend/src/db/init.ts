import { pool } from "./pool";

export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS postgis");
    await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");

    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source VARCHAR(32) NOT NULL,
        source_id VARCHAR(255) NOT NULL,
        event_type VARCHAR(64) NOT NULL,
        sub_event_type VARCHAR(128),
        title VARCHAR(512) NOT NULL,
        description TEXT,
        url VARCHAR(2048),
        location GEOMETRY(POINT, 4326) NOT NULL,
        location_name VARCHAR(255),
        country VARCHAR(100),
        region VARCHAR(100),
        event_date TIMESTAMPTZ NOT NULL,
        scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        fatalities INTEGER DEFAULT 0,
        actors TEXT[],
        tags TEXT[],
        UNIQUE(source, source_id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS ix_events_location ON events USING GIST(location)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS ix_events_date ON events(event_date)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS ix_events_type ON events(event_type)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS summaries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(512) NOT NULL,
        content TEXT NOT NULL,
        event_count INTEGER NOT NULL,
        center GEOMETRY(POINT, 4326),
        event_ids UUID[] NOT NULL,
        generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        model_used VARCHAR(64)
      )
    `);

    console.log("[db] Tables and indexes created");
  } finally {
    client.release();
  }
}

// Run standalone
if (require.main === module) {
  initDb()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
