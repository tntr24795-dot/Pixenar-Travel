"use client";

import * as React from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPinned } from "lucide-react";

import { formatCents, cn } from "@/lib/utils";

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
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  className?: string;
}

const FALLBACK_CENTER: [number, number] = [-97.7431, 30.2672];

export function ListingsMap({ pins, centerLat, centerLng, zoom = 11, className }: ListingsMapProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [loadError, setLoadError] = React.useState(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  React.useEffect(() => {
    if (!token || !containerRef.current) return;

    mapboxgl.accessToken = token;
    setLoadError(false);

    const validPins = pins.filter(
      (pin) => Number.isFinite(pin.latitude) && Number.isFinite(pin.longitude)
    );
    const fallbackCenter: [number, number] = validPins.length
      ? [validPins[0].longitude, validPins[0].latitude]
      : FALLBACK_CENTER;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center:
        centerLng != null && centerLat != null
          ? [centerLng, centerLat]
          : fallbackCenter,
      zoom,
      attributionControl: false,
      cooperativeGestures: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
    map.on("error", () => setLoadError(true));

    const markers = validPins.map((pin) => {
      const link = document.createElement("a");
      link.href = `/listing/${pin.slug}`;
      link.className = "pixenar-map-pin";
      link.setAttribute("aria-label", `View ${pin.slug}`);
      link.textContent =
        pin.priceCents != null
          ? formatCents(pin.priceCents, pin.currency ?? "USD").replace(/\.00$/, "")
          : "View";

      return new mapboxgl.Marker({ element: link, anchor: "bottom" })
        .setLngLat([pin.longitude, pin.latitude])
        .addTo(map);
    });

    if (validPins.length > 1 && centerLat == null && centerLng == null) {
      const bounds = new mapboxgl.LngLatBounds();
      validPins.forEach((pin) => bounds.extend([pin.longitude, pin.latitude]));
      map.fitBounds(bounds, { padding: 72, maxZoom: 13, duration: 0 });
    }

    return () => {
      markers.forEach((marker) => marker.remove());
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, JSON.stringify(pins), centerLat, centerLng, zoom]);

  if (!token || loadError) {
    return (
      <div
        className={cn(
          "flex h-full min-h-[300px] w-full flex-col items-center justify-center rounded-2xl border border-border bg-secondary/60 p-8 text-center",
          className
        )}
        role="status"
      >
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-background text-primary shadow-sm">
          <MapPinned className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="font-display text-lg font-semibold">Map is taking a short break</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          You can still browse every stay in the list.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("h-full min-h-[300px] w-full overflow-hidden rounded-2xl bg-muted", className)}
      aria-label="Map of available stays"
    />
  );
}
