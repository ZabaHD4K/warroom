import { Router, Request, Response } from "express";
import * as eventService from "../services/eventService";
import { generateSummary } from "../services/summaryService";

const router = Router();

router.post("/generate", async (req: Request, res: Response) => {
  try {
    const { event_ids, bbox, date_from, date_to } = req.body;

    let events;
    if (event_ids && event_ids.length > 0) {
      const results = await Promise.all(
        event_ids.map((id: string) => eventService.getEventById(id))
      );
      events = results.filter(Boolean);
    } else if (bbox) {
      const result = await eventService.getEvents({
        bbox,
        date_from,
        date_to,
        limit: 50,
      });
      events = result.items;
    } else {
      res.status(400).json({ error: "Provide event_ids or bbox" });
      return;
    }

    if (!events || events.length === 0) {
      res.status(404).json({ error: "No events found" });
      return;
    }

    const summary = await generateSummary(events as any);
    if (!summary) {
      res.status(500).json({ error: "Failed to generate summary" });
      return;
    }

    res.json(summary);
  } catch (e: any) {
    console.error("[api] Error generating summary:", e.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
