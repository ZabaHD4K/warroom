"use client";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useEvents, useStats } from "@/hooks/useEvents";
import StatsBar from "@/components/StatsBar";
import EventPanel from "@/components/EventPanel";
import EventList from "@/components/EventList";
import Filters from "@/components/Filters";
import { ConflictEvent } from "@/lib/types";

const ConflictMap = dynamic(() => import("@/components/ConflictMap"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-zinc-950 flex items-center justify-center">
      <span className="text-zinc-500">Loading map...</span>
    </div>
  ),
});

export default function Home() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<ConflictEvent | null>(null);
  const { events, total, loading, error } = useEvents(filters);
  const { stats, loading: statsLoading } = useStats();

  const handleEventClick = useCallback((event: ConflictEvent) => {
    setSelected(event);
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-red-500">WAR</span>{" "}
            <span className="text-zinc-300">ROOM</span>
          </h1>
          <span className="text-xs text-zinc-500 font-mono">
            OSINT CONFLICT DASHBOARD
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {loading && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
              Loading...
            </span>
          )}
          {!loading && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              {total} events loaded
            </span>
          )}
          {error && <span className="text-red-400">API Error</span>}
        </div>
      </header>

      {/* Stats bar */}
      <StatsBar stats={stats} loading={statsLoading} />

      {/* Main content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Map */}
        <ConflictMap
          events={events}
          onEventClick={handleEventClick}
          selectedId={selected?.id}
        />

        {/* Filters panel */}
        <Filters filters={filters} onChange={setFilters} />

        {/* Event detail panel */}
        <EventPanel event={selected} onClose={() => setSelected(null)} />

        {/* Event list */}
        {!selected && <EventList events={events} onSelect={handleEventClick} />}
      </div>
    </div>
  );
}
