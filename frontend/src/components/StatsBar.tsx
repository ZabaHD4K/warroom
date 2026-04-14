"use client";
import { EventStats, EVENT_LABELS } from "@/lib/types";

interface Props {
  stats: EventStats | null;
  loading: boolean;
}

export default function StatsBar({ stats, loading }: Props) {
  if (loading || !stats) {
    return (
      <div className="flex gap-4 p-3 bg-zinc-900/90 border-b border-zinc-700 text-sm">
        <span className="text-zinc-500">Loading stats...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6 px-4 py-2 bg-zinc-900/90 border-b border-zinc-700 text-sm overflow-x-auto">
      <div className="flex items-center gap-2">
        <span className="text-zinc-400">Total Events</span>
        <span className="font-mono font-bold text-white">
          {stats.total_events.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-zinc-400">Last 24h</span>
        <span className="font-mono font-bold text-orange-400">
          {stats.events_24h.toLocaleString()}
        </span>
      </div>
      <div className="h-4 w-px bg-zinc-700" />
      {Object.entries(stats.by_source).map(([source, count]) => (
        <div key={source} className="flex items-center gap-1">
          <span className="text-zinc-500 uppercase text-xs">{source}</span>
          <span className="font-mono text-zinc-300">{count}</span>
        </div>
      ))}
    </div>
  );
}
