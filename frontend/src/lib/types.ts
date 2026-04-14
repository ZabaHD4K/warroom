export interface ConflictEvent {
  id: string;
  source: string;
  source_id: string;
  event_type: string;
  sub_event_type: string | null;
  title: string;
  description: string | null;
  url: string | null;
  latitude: number;
  longitude: number;
  location_name: string | null;
  country: string | null;
  region: string | null;
  event_date: string;
  scraped_at: string;
  fatalities: number;
  actors: string[] | null;
  tags: string[] | null;
}

export interface EventsResponse {
  items: ConflictEvent[];
  total: number;
}

export interface EventStats {
  total_events: number;
  events_24h: number;
  by_type: Record<string, number>;
  by_source: Record<string, number>;
}

export const EVENT_COLORS: Record<string, [number, number, number]> = {
  battle: [220, 38, 38],       // red
  explosion: [249, 115, 22],   // orange
  fight: [220, 38, 38],        // red
  assault: [239, 68, 68],      // light red
  mass_violence: [185, 28, 28],// dark red
  protest: [59, 130, 246],     // blue
  riot: [147, 51, 234],        // purple
  coercion: [234, 179, 8],     // yellow
  violence_against_civilians: [236, 72, 153], // pink
  strategic_development: [34, 197, 94],       // green
  news_report: [156, 163, 175],              // gray
};

export const EVENT_LABELS: Record<string, string> = {
  battle: "Battle",
  explosion: "Explosion",
  fight: "Fight",
  assault: "Assault",
  mass_violence: "Mass Violence",
  protest: "Protest",
  riot: "Riot",
  coercion: "Coercion",
  violence_against_civilians: "Violence vs Civilians",
  strategic_development: "Strategic Dev.",
  news_report: "News Report",
};
