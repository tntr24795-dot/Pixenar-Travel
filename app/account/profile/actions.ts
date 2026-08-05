"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl: string;
}

export interface UpdateProfileResult {
  success: boolean;
  error?: string;
}

/**
 * Updates the signed-in user's own `profiles` row. Authorization comes from
 * the `profiles_update_own` RLS policy (`id = auth.uid()`) enforced by the
 * session-bound server client — no admin client needed, and no server-side
 * ownership check required beyond "use the session client".
 */
export async function updateProfile(input: UpdateProfileInput): Promise<UpdateProfileResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to update your profile." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: input.firstName.trim() || null,
      last_name: input.lastName.trim() || null,
      phone: input.phone.trim() || null,
      avatar_url: input.avatarUrl.trim() || null,
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/account/profile");
  revalidatePath("/account");
  return { success: true };
}
