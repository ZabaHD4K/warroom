"use client";
import { EVENT_LABELS, EVENT_COLORS } from "@/lib/types";

interface Props {
  filters: Record<string, string>;
  onChange: (filters: Record<string, string>) => void;
}

export default function Filters({ filters, onChange }: Props) {
  const update = (key: string, value: string) => {
    const next = { ...filters };
    if (value) {
      next[key] = value;
    } else {
      delete next[key];
    }
    onChange(next);
  };

  return (
    <div className="absolute top-2 left-2 z-10 bg-zinc-900/90 backdrop-blur border border-zinc-700 rounded-lg p-3 w-64">
      <h3 className="text-xs font-bold text-zinc-400 uppercase mb-2 tracking-wider">
        Filters
      </h3>

      <div className="space-y-2">
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Event Type</label>
          <select
            value={filters.event_type || ""}
            onChange={(e) => update("event_type", e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm text-white"
          >
            <option value="">All types</option>
            {Object.entries(EVENT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">Country</label>
          <input
            type="text"
            placeholder="e.g. Ukraine"
            value={filters.country || ""}
            onChange={(e) => update("country", e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm text-white placeholder-zinc-500"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">Source</label>
          <select
            value={filters.source || ""}
            onChange={(e) => update("source", e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm text-white"
          >
            <option value="">All sources</option>
            <option value="acled">ACLED</option>
            <option value="gdelt">GDELT</option>
            <option value="rss">RSS</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">Date From</label>
          <input
            type="date"
            value={filters.date_from || ""}
            onChange={(e) => update("date_from", e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm text-white"
          />
        </div>

        {Object.keys(filters).length > 0 && (
          <button
            onClick={() => onChange({})}
            className="w-full text-xs text-zinc-400 hover:text-white py-1 border border-zinc-700 rounded"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-2 border-t border-zinc-700">
        <h4 className="text-xs text-zinc-500 mb-1">Legend</h4>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(EVENT_LABELS)
            .slice(0, 8)
            .map(([key, label]) => {
              const c = EVENT_COLORS[key] || [156, 163, 175];
              return (
                <div key={key} className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: `rgb(${c.join(",")})` }}
                  />
                  <span className="text-[10px] text-zinc-400">{label}</span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
