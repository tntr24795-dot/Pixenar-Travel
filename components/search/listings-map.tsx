"use client";

import * as React from "react";

import { formatCents, cn } from "@/lib/utils";
import { loadGoogleMapsScript } from "@/lib/google/load-maps-script";

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

const FALLBACK_CENTER = { lat: 30.2672, lng: -97.7431 }; // Austin, TX -- Pixenar Travel's Texas launch market

/**
 * Client-only Google Maps view showing a pin per result (search page) or a
 * single approximate pin (listing detail page). Renders a friendly
 * placeholder instead of crashing if NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is unset.
 *
 * Uses AdvancedMarkerElement (the "marker" library) so each pin can be a
 * plain styled <div> -- same idea as the old Mapbox `new mapboxgl.Marker({
 * element })` pins. AdvancedMarkerElement requires a Map ID; "DEMO_MAP_ID"
 * below is Google's own public placeholder that works out of the box for
 * development. For production, create a real Map ID in Google Cloud
 * Console (Google Maps Platform -> Map Management) and swap it in --
 * that's also where you'd apply custom map styling.
 */
export function ListingsMap({ pins, centerLat, centerLng, zoom = 11, className }: ListingsMapProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  React.useEffect(() => {
    if (!apiKey || !containerRef.current) return;

    let cancelled = false;
    const markers: google.maps.marker.AdvancedMarkerElement[] = [];

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled || !containerRef.current) return;

        const validPins = pins.filter(
          (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
        );
        const fallbackCenter =
          validPins.length > 0
            ? { lat: validPins[0].latitude, lng: validPins[0].longitude }
            : FALLBACK_CENTER;

        const map = new google.maps.Map(containerRef.current, {
          center: centerLat != null && centerLng != null ? { lat: centerLat, lng: centerLng } : fallbackCenter,
          zoom,
          mapId: "DEMO_MAP_ID",
          disableDefaultUI: true,
          zoomControl: true,
        });

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

          const marker = new google.maps.marker.AdvancedMarkerElement({
            map,
            position: { lat: pin.latitude, lng: pin.longitude },
            content: el,
          });
          markers.push(marker);
        }
      })
      .catch((err) => {
        console.error("[ListingsMap] failed to load Google Maps:", err);
      });

    return () => {
      cancelled = true;
      markers.forEach((m) => (m.map = null));
    };
    // Re-init the whole map when pins/center change -- simplest correct
    // behavior for an MVP result set that's at most a page (~20) of pins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, JSON.stringify(pins), centerLat, centerLng, zoom]);

  if (!apiKey) {
    return (
      <div
        className={cn(
          "flex h-full min-h-[300px] w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted p-6 text-center text-sm text-muted-foreground",
          className
        )}
      >
        Map unavailable — set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      </div>
    );
  }

  return <div ref={containerRef} className={cn("h-full min-h-[300px] w-full rounded-xl", className)} />;
}
