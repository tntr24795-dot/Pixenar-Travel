import { NextResponse, type NextRequest } from "next/server";

import { requireAdminApi } from "@/lib/admin/require-admin";
import { rejectListing } from "@/lib/admin/listings";

/**
 * POST /api/admin/listings/[id]/reject
 * pending_review -> rejected.
 * Re-checks admin role server-side (in addition to `app/admin/layout.tsx`'s
 * check, since this route can be called directly, not just navigated to).
 */
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    await rejectListing({
      supabase: auth.supabase,
      adminId: auth.user.id,
      listingId: params.id,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to reject listing" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
