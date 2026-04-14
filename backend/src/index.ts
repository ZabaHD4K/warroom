import express from "express";
import cors from "cors";
import { createServer } from "http";
import cron from "node-cron";

import { config } from "./config";
import { initDb } from "./db/init";
import { initWebSocket } from "./services/broadcast";
import eventsRouter from "./routes/events";
import summariesRouter from "./routes/summaries";
import { scrapeAcled } from "./scrapers/acled";
import { scrapeGdelt } from "./scrapers/gdelt";
import { scrapeRss } from "./scrapers/rss";

async function main() {
  // Init database
  console.log("[boot] Initializing database...");
  await initDb();

  // Express app
  const app = express();
  app.use(cors({ origin: ["http://localhost:3000", "http://localhost:5173"] }));
  app.use(express.json());

  // Routes
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/events", eventsRouter);
  app.use("/api/summaries", summariesRouter);

  // HTTP + WebSocket server
  const server = createServer(app);
  initWebSocket(server);

  // Start server
  server.listen(config.port, () => {
    console.log(`[boot] War Room backend running on http://localhost:${config.port}`);
    console.log(`[boot] API docs: http://localhost:${config.port}/health`);
  });

  // Initial scrape
  console.log("[boot] Running initial scrape...");
  await scrapeGdelt().catch((e) => console.error("[gdelt] Initial scrape failed:", e));
  await scrapeRss().catch((e) => console.error("[rss] Initial scrape failed:", e));
  if (config.acledApiKey) {
    await scrapeAcled().catch((e) => console.error("[acled] Initial scrape failed:", e));
  }
  console.log("[boot] Initial scrape complete.");

  // Schedule scrapers
  cron.schedule("*/15 * * * *", () => {
    scrapeGdelt().catch((e) => console.error("[gdelt] Scheduled scrape failed:", e));
  });
  cron.schedule("0 * * * *", () => {
    scrapeRss().catch((e) => console.error("[rss] Scheduled scrape failed:", e));
  });
  cron.schedule("0 */6 * * *", () => {
    if (config.acledApiKey) {
      scrapeAcled().catch((e) => console.error("[acled] Scheduled scrape failed:", e));
    }
  });

  console.log("[boot] Schedulers active: GDELT (15m), RSS (1h), ACLED (6h)");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
