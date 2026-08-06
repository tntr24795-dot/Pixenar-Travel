"use client";

import * as React from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { formatCents } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface MapPin {
  id: string;
  slug: string;
  latitude: number;
  longitude: number;
  priceCents?: number;
  currency?: string;
}

export interface ListingsMapProps {
  pins: MapPin[];
  /** Optional explicit map center; falls back to the first pin, then Austin, TX. */
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  className?: string;
}

const FALLBACK_CENTER: [number, number] = [-97.7431, 30.2672]; // Austin, TX -- Havena's Texas launch market

/**
 * Client-only Mapbox GL map showing a pin per result (search page) or a
 * single approximate pin (listing detail page). Renders a friendly
 * placeholder instead of crashing if NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is unset.
 */
export function ListingsMap({ pins, centerLat, centerLng, zoom = 11, className }: ListingsMapProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  React.useEffect(() => {
    if (!token || !containerRef.current) return;

    mapboxgl.accessToken = token;

    const validPins = pins.filter(
      (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
    );
    const fallbackCenter: [number, number] = validPins.length
      ? [validPins[0].longitude, validPins[0].latitude]
      : FALLBACK_CENTER;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: centerLng != null && centerLat != null ? [centerLng, centerLat] : fallbackCenter,
      zoom,
    });

    const markers: mapboxgl.Marker[] = [];
    for (const pin of validPins) {
      const el = document.createElement("div");
      el.className =
        "rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground shadow-md border border-white cursor-pointer whitespace-nowrap";
      el.textContent =
        pin.priceCents != null
          ? formatCents(pin.priceCents, pin.currency ?? "USD").replace(/\.00$/, "")
          : "•";
      el.addEventListener("click", () => {
        window.location.href = `/listing/${pin.slug}`;
      });
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([pin.longitude, pin.latitude])
        .addTo(map);
      markers.push(marker);
    }

    return () => {
      markers.forEach((m) => m.remove());
      map.remove();
    };
    // Re-init the whole map when pins/center change -- simplest correct
    // behavior for an MVP result set that's at most a page (~20) of pins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, JSON.stringify(pins), centerLat, centerLng, zoom]);

  if (!token) {
    return (
      <div
        className={cn(
          "flex h-full min-h-[300px] w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted p-6 text-center text-sm text-muted-foreground",
          className
        )}
      >
        Map unavailable — set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
      </div>
    );
  }

  return <div ref={containerRef} className={cn("h-full min-h-[300px] w-full rounded-xl", className)} />;
}
