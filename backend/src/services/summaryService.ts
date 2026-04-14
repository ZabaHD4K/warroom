import Anthropic from "@anthropic-ai/sdk";
import { pool } from "../db/pool";
import { config } from "../config";
import { EventRow, SummaryRow } from "../models/types";

const SYSTEM_PROMPT = `You are a military intelligence analyst. Given a set of conflict events,
produce a concise situation briefing in markdown format. Include:
- What happened (types of events, scale)
- Where (geographic concentration)
- Who is involved (actors, forces)
- Assessment (what it might mean, trends)

Be factual and cite the data provided. Keep it under 500 words.`;

const MODEL = "claude-sonnet-4-20250514";

export async function generateSummary(
  events: EventRow[]
): Promise<SummaryRow | null> {
  if (events.length === 0) return null;

  if (!config.anthropicApiKey) {
    console.warn("[summary] No ANTHROPIC_API_KEY, skipping");
    return null;
  }

  const eventsText = events.slice(0, 30).map(
    (e) =>
      `- [${e.event_date}] ${e.event_type}: ${e.title} | Location: ${e.location_name || "Unknown"}, ${e.country || "Unknown"} | Actors: ${e.actors?.join(", ") || "Unknown"} | Fatalities: ${e.fatalities} | Source: ${e.source}`
  );

  const userMessage = `Analyze these ${events.length} conflict events and produce a situation briefing:\n\n${eventsText.join("\n")}`;

  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const content =
      response.content[0].type === "text" ? response.content[0].text : "";

    const avgLat =
      events.reduce((s, e) => s + e.latitude, 0) / events.length;
    const avgLon =
      events.reduce((s, e) => s + e.longitude, 0) / events.length;

    const title = `Situation Briefing: ${events[0].country || "Multiple Regions"} (${events.length} events)`;

    const result = await pool.query(
      `INSERT INTO summaries (title, content, event_count, center, event_ids, model_used)
      VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6, $7)
      RETURNING id, title, content, event_count, generated_at, model_used`,
      [
        title,
        content,
        events.length,
        avgLon,
        avgLat,
        events.map((e) => e.id),
        MODEL,
      ]
    );

    return result.rows[0];
  } catch (e) {
    console.error("[summary] Claude API error:", e);
    return null;
  }
}
