export interface EventCreate {
  source: string;
  source_id: string;
  event_type: string;
  sub_event_type?: string;
  title: string;
  description?: string;
  url?: string;
  latitude: number;
  longitude: number;
  location_name?: string;
  country?: string;
  region?: string;
  event_date: Date;
  fatalities?: number;
  actors?: string[];
  tags?: string[];
}

export interface EventRow {
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

export interface EventStats {
  total_events: number;
  events_24h: number;
  by_type: Record<string, number>;
  by_source: Record<string, number>;
}

export interface SummaryRow {
  id: string;
  title: string;
  content: string;
  event_count: number;
  generated_at: string;
  model_used: string | null;
}
