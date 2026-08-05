import "server-only";

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * Forward geocoding via the Mapbox Geocoding API: turns a free-text address
 * into coordinates. Requires MAPBOX_SECRET_TOKEN (server-side token) in the
 * environment — see .env.local.example.
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const token = process.env.MAPBOX_SECRET_TOKEN;
  if (!token) {
    throw new Error("MAPBOX_SECRET_TOKEN is not set.");
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    query
  )}.json?access_token=${token}&limit=1`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Mapbox geocoding failed: ${res.status}`);
  }

  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;

  const [longitude, latitude] = feature.center;
  return { latitude, longitude, formattedAddress: feature.place_name };
}

/** Reverse geocoding: coordinates -> a human-readable place name. */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  const token = process.env.MAPBOX_SECRET_TOKEN;
  if (!token) {
    throw new Error("MAPBOX_SECRET_TOKEN is not set.");
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Mapbox reverse geocoding failed: ${res.status}`);
  }
  const data = await res.json();
  return data.features?.[0]?.place_name ?? null;
}
