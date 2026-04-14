"use client";
import { ConflictEvent, EVENT_COLORS, EVENT_LABELS } from "@/lib/types";

interface Props {
  events: ConflictEvent[];
  selectedId?: string;
  onSelect: (event: ConflictEvent) => void;
}

export default function EventList({ events, selectedId, onSelect }: Props) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 bg-zinc-900/95 border-t border-zinc-700 max-h-56 overflow-y-auto">
      <div className="px-4 py-2 border-b border-zinc-800 sticky top-0 bg-zinc-900/95">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Recent Events ({events.length})
        </span>
      </div>
      <div className="divide-y divide-zinc-800">
        {events.slice(0, 50).map((event) => {
          const color = EVENT_COLORS[event.event_type] || [156, 163, 175];
          const isSelected = event.id === selectedId;
          return (
            <button
              key={event.id}
              onClick={() => onSelect(event)}
              className={`w-full text-left px-4 py-2 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors ${
                isSelected ? "bg-zinc-800" : ""
              }`}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: `rgb(${color.join(",")})` }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-zinc-200 truncate">{event.title}</p>
                <p className="text-xs text-zinc-500">
                  {new Date(event.event_date).toLocaleDateString()} &middot;{" "}
                  {EVENT_LABELS[event.event_type] || event.event_type} &middot;{" "}
                  {event.country || "Unknown"}
                  {event.fatalities > 0 && (
                    <span className="text-red-400 ml-1">
                      &middot; {event.fatalities} killed
                    </span>
                  )}
                </p>
              </div>
              <span className="text-[10px] text-zinc-600 uppercase font-mono shrink-0">
                {event.source}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
