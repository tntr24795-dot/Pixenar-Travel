import "server-only";

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * Forward geocoding via the Google Geocoding API: turns a free-text address
 * into coordinates. Requires GOOGLE_MAPS_SERVER_API_KEY (server-side key,
 * with the "Geocoding API" enabled in Google Cloud Console) in the
 * environment -- see .env.local.example.
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!key) {
    throw new Error("GOOGLE_MAPS_SERVER_API_KEY is not set.");
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    query
  )}&key=${key}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Google geocoding failed: ${res.status}`);
  }

  const data = await res.json();
  if (data.status !== "OK") {
    if (data.status === "ZERO_RESULTS") return null;
    throw new Error(`Google geocoding error: ${data.status}${data.error_message ? ` - ${data.error_message}` : ""}`);
  }

  const result = data.results?.[0];
  if (!result) return null;

  return {
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
  };
}

/** Reverse geocoding: coordinates -> a human-readable place name. */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!key) {
    throw new Error("GOOGLE_MAPS_SERVER_API_KEY is not set.");
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Google reverse geocoding failed: ${res.status}`);
  }
  const data = await res.json();
  if (data.status !== "OK") return null;
  return data.results?.[0]?.formatted_address ?? null;
}
