import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/mapbox/geocode";

/**
 * POST /api/host/geocode
 *
 * Wraps `geocodeAddress()` (server-only, needs MAPBOX_SECRET_TOKEN) so the
 * listing wizard's "Look up coordinates" button can call it from the
 * browser without ever shipping the secret Mapbox token to the client.
 *
 * Body: { addressLine1, addressLine2?, city, state, postalCode, country }
 * Response: { latitude, longitude, formattedAddress }
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const addressLine1 = typeof body?.addressLine1 === "string" ? body.addressLine1 : "";
  const addressLine2 = typeof body?.addressLine2 === "string" ? body.addressLine2 : "";
  const city = typeof body?.city === "string" ? body.city : "";
  const state = typeof body?.state === "string" ? body.state : "";
  const postalCode = typeof body?.postalCode === "string" ? body.postalCode : "";
  const country = typeof body?.country === "string" ? body.country : "";

  if (!addressLine1.trim() || !city.trim()) {
    return NextResponse.json(
      { error: "addressLine1 and city are required" },
      { status: 400 }
    );
  }

  const query = [addressLine1, addressLine2, city, state, postalCode, country]
    .filter((part) => part && part.trim().length > 0)
    .join(", ");

  try {
    const result = await geocodeAddress(query);
    if (!result) {
      return NextResponse.json(
        { error: "No matching location found for that address" },
        { status: 404 }
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/host/geocode]", error);
    return NextResponse.json(
      { error: "Geocoding failed. Please try again." },
      { status: 502 }
    );
  }
}
