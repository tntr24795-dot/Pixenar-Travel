import "server-only";

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

type MapboxFeature = {
  center?: [number, number];
  place_name?: string;
};

type MapboxGeocodingResponse = {
  features?: MapboxFeature[];
};

function getToken() {
  // Server-side geocoding can use either the dedicated secret token or the
  // public token already required by the map. This keeps destination maps
  // working on deployments that only configured the original public token.
  const token =
    process.env.MAPBOX_SECRET_TOKEN ??
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!token) throw new Error("A Mapbox access token is not set.");
  return token;
}

async function fetchFeature(path: string): Promise<MapboxFeature | null> {
  const params = new URLSearchParams({ access_token: getToken(), limit: "1" });
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${path}.json?${params}`,
    { next: { revalidate: 86400 } }
  );

  if (!response.ok) throw new Error(`Mapbox geocoding failed: ${response.status}`);
  const data = (await response.json()) as MapboxGeocodingResponse;
  return data.features?.[0] ?? null;
}

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const feature = await fetchFeature(encodeURIComponent(query));
  if (!feature?.center) return null;

  const [longitude, latitude] = feature.center;
  return {
    latitude,
    longitude,
    formattedAddress: feature.place_name ?? query,
  };
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  const feature = await fetchFeature(`${longitude},${latitude}`);
  return feature?.place_name ?? null;
}
