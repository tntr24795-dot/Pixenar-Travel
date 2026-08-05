"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface StripeOnboardingButtonProps {
  /** When true, this click also needs to create the initial host_profiles row. */
  createProfileFirst: boolean;
  label: string;
}

/**
 * Calls the Stripe Connect onboarding route (owned by the booking/Stripe
 * agent — `POST /api/stripe/connect/onboarding`, returns `{ url }`) and
 * redirects the browser there. Optionally inserts the host's `host_profiles`
 * row first (covered by the `host_profiles_insert_own` RLS policy).
 */
export function StripeOnboardingButton({ createProfileFirst, label }: StripeOnboardingButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleClick() {
    setLoading(true);
    try {
      if (createProfileFirst) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("You need to be signed in.");

        const { error } = await supabase
          .from("host_profiles")
          .insert({ user_id: user.id });

        // Ignore "already exists" (unique violation) — safe to continue to
        // Stripe onboarding either way.
        if (error && error.code !== "23505") {
          throw error;
        }
      }

      const res = await fetch("/api/stripe/connect/onboarding", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn't start Stripe onboarding.");
      }
      const { url } = await res.json();
      if (!url) throw new Error("Stripe didn't return an onboarding link.");
      window.location.href = url;
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading} size="lg">
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}
