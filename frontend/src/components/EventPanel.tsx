"use client";
import { ConflictEvent, EVENT_COLORS, EVENT_LABELS } from "@/lib/types";

interface Props {
  event: ConflictEvent | null;
  onClose: () => void;
}

export default function EventPanel({ event, onClose }: Props) {
  if (!event) return null;

  const color = EVENT_COLORS[event.event_type] || [156, 163, 175];
  const label = EVENT_LABELS[event.event_type] || event.event_type;

  return (
    <div className="absolute top-0 right-0 w-96 h-full bg-zinc-900/95 border-l border-zinc-700 overflow-y-auto z-20">
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <span
            className="text-xs font-bold px-2 py-1 rounded uppercase"
            style={{ backgroundColor: `rgb(${color.join(",")})`, color: "white" }}
          >
            {label}
          </span>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <h2 className="text-lg font-bold text-white mb-2">{event.title}</h2>

        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="text-zinc-500">Date</span>
            <span className="text-zinc-200">
              {new Date(event.event_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          {event.location_name && (
            <div className="flex gap-2">
              <span className="text-zinc-500">Location</span>
              <span className="text-zinc-200">{event.location_name}</span>
            </div>
          )}

          {event.country && (
            <div className="flex gap-2">
              <span className="text-zinc-500">Country</span>
              <span className="text-zinc-200">{event.country}</span>
            </div>
          )}

          {event.fatalities > 0 && (
            <div className="flex gap-2">
              <span className="text-zinc-500">Fatalities</span>
              <span className="text-red-400 font-bold">{event.fatalities}</span>
            </div>
          )}

          {event.actors && event.actors.length > 0 && (
            <div>
              <span className="text-zinc-500 block mb-1">Actors</span>
              <div className="flex flex-wrap gap-1">
                {event.actors.map((a, i) => (
                  <span
                    key={i}
                    className="bg-zinc-800 text-zinc-300 text-xs px-2 py-0.5 rounded"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <span className="text-zinc-500">Source</span>
            <span className="text-zinc-300 uppercase text-xs font-mono">
              {event.source}
            </span>
          </div>

          <div className="flex gap-2">
            <span className="text-zinc-500">Coords</span>
            <span className="text-zinc-400 font-mono text-xs">
              {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
            </span>
          </div>
        </div>

        {event.description && (
          <div className="mt-4 pt-3 border-t border-zinc-700">
            <p className="text-zinc-300 text-sm leading-relaxed">
              {event.description.slice(0, 500)}
              {event.description.length > 500 && "..."}
            </p>
          </div>
        )}

        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-sm text-blue-400 hover:text-blue-300 underline"
          >
            View source
          </a>
        )}
      </div>
    </div>
  );
}
