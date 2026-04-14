"use client";
import { useState, useEffect, useCallback } from "react";
import { ConflictEvent, EventStats, EventsResponse } from "@/lib/types";
import { fetchEvents, fetchStats, createWebSocket } from "@/lib/api";

export function useEvents(filters?: Record<string, string>) {
  const [events, setEvents] = useState<ConflictEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data: EventsResponse = await fetchEvents({
        limit: "1000",
        ...filters,
      });
      setEvents(data.items);
      setTotal(data.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    load();
  }, [load]);

  // WebSocket for live updates
  useEffect(() => {
    let ws: WebSocket;
    try {
      ws = createWebSocket();
      ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.type === "scraper_update") {
          // Reload events when new data arrives
          load();
        }
      };
      ws.onerror = () => {};
    } catch {}
    return () => {
      ws?.close();
    };
  }, [load]);

  return { events, total, loading, error, reload: load };
}

export function useStats() {
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}
