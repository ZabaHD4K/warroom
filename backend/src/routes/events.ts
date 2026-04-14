import { Router, Request, Response } from "express";
import * as eventService from "../services/eventService";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await eventService.getEvents({
      bbox: req.query.bbox as string,
      event_type: req.query.event_type as string,
      country: req.query.country as string,
      source: req.query.source as string,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    });
    res.json(result);
  } catch (e: any) {
    console.error("[api] Error fetching events:", e.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const stats = await eventService.getStats();
    res.json(stats);
  } catch (e: any) {
    console.error("[api] Error fetching stats:", e.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const event = await eventService.getEventById(req.params.id as string);
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    res.json(event);
  } catch (e: any) {
    console.error("[api] Error fetching event:", e.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
