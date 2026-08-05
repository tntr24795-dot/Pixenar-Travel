"use server";

import { revalidatePath } from "next/cache";

import { requireAdminPage } from "@/lib/admin/require-admin";
import { suspendListing as suspendListingShared } from "@/lib/admin/listings";

/**
 * Suspend an active listing for a policy violation. Approve/reject go
 * through the dedicated `app/api/admin/listings/[id]/approve|reject` routes
 * (per the client's documented endpoint list); suspend has no such
 * requirement, so it's a plain Server Action calling the same shared
 * `lib/admin/listings.ts` mutation logic.
 */
export async function suspendListing(listingId: string) {
  const { supabase, user } = await requireAdminPage();

  await suspendListingShared({
    supabase,
    adminId: user.id,
    listingId,
  });

  revalidatePath("/admin/listings");
}
