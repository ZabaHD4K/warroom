const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function fetchEvents(params?: Record<string, string>): Promise<any> {
  const url = new URL(`${API_BASE}/api/events`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });
  }
  const resp = await fetch(url.toString());
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}

export async function fetchStats(): Promise<any> {
  const resp = await fetch(`${API_BASE}/api/events/stats`);
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}

export async function fetchEventById(id: string): Promise<any> {
  const resp = await fetch(`${API_BASE}/api/events/${id}`);
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}

export async function generateSummary(body: {
  event_ids?: string[];
  bbox?: string;
  date_from?: string;
  date_to?: string;
}): Promise<any> {
  const resp = await fetch(`${API_BASE}/api/summaries/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}

export function createWebSocket(): WebSocket {
  const wsUrl = API_BASE.replace(/^http/, "ws");
  return new WebSocket(`${wsUrl}/ws/events`);
}
