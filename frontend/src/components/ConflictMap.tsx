"use client";
import { useRef, useCallback, useMemo } from "react";
import Map, { NavigationControl, MapRef } from "react-map-gl/maplibre";
import { DeckGLOverlay } from "./DeckOverlay";
import { ScatterplotLayer } from "@deck.gl/layers";
import { ConflictEvent, EVENT_COLORS } from "@/lib/types";
import "maplibre-gl/dist/maplibre-gl.css";

interface Props {
  events: ConflictEvent[];
  onEventClick: (event: ConflictEvent) => void;
  selectedId?: string;
}

export default function ConflictMap({ events, onEventClick, selectedId }: Props) {
  const mapRef = useRef<MapRef>(null);

  const layers = useMemo(() => {
    return [
      new ScatterplotLayer<ConflictEvent>({
        id: "events",
        data: events,
        getPosition: (d) => [d.longitude, d.latitude],
        getRadius: (d) => {
          if (d.id === selectedId) return 12000;
          if (d.fatalities > 10) return 8000;
          if (d.fatalities > 0) return 5000;
          return 3500;
        },
        getFillColor: (d) => {
          const base = EVENT_COLORS[d.event_type] || [156, 163, 175];
          const alpha = d.id === selectedId ? 230 : 180;
          return [...base, alpha] as [number, number, number, number];
        },
        getLineColor: (d) =>
          d.id === selectedId ? [255, 255, 255, 255] : [0, 0, 0, 0],
        getLineWidth: (d) => (d.id === selectedId ? 2 : 0),
        lineWidthUnits: "pixels",
        radiusMinPixels: 3,
        radiusMaxPixels: 20,
        pickable: true,
        onClick: ({ object }) => {
          if (object) onEventClick(object);
        },
        updateTriggers: {
          getRadius: selectedId,
          getFillColor: selectedId,
          getLineColor: selectedId,
          getLineWidth: selectedId,
        },
      }),
    ];
  }, [events, selectedId, onEventClick]);

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: 30,
        latitude: 25,
        zoom: 2.5,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    >
      <DeckGLOverlay layers={layers} />
      <NavigationControl position="bottom-right" />
    </Map>
  );
}
