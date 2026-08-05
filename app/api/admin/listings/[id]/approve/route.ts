import { NextResponse, type NextRequest } from "next/server";

import { requireAdminApi } from "@/lib/admin/require-admin";
import { approveListing } from "@/lib/admin/listings";

/**
 * POST /api/admin/listings/[id]/approve
 * pending_review -> active (and sets published_at if not already set).
 * Re-checks admin role server-side (in addition to `app/admin/layout.tsx`'s
 * check, since this route can be called directly, not just navigated to).
 */
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    await approveListing({
      supabase: auth.supabase,
      adminId: auth.user.id,
      listingId: params.id,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to approve listing" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
