"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PauseCircle, PlayCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface PauseListingButtonProps {
  listingId: string;
  currentStatus: "active" | "paused";
}

/**
 * Toggles a listing between `active` and `paused`. Allowed directly from the
 * client because `listings_update_own_or_admin` RLS lets a host update any
 * column on their own listing rows.
 */
export function PauseListingButton({ listingId, currentStatus }: PauseListingButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const isPaused = currentStatus === "paused";

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    const nextStatus = isPaused ? "active" : "paused";

    const { error } = await supabase
      .from("listings")
      .update({ status: nextStatus })
      .eq("id", listingId);

    setLoading(false);

    if (error) {
      toast({
        title: "Couldn't update listing",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: isPaused ? "Listing reactivated" : "Listing paused",
      description: isPaused
        ? "Your listing is visible in search again."
        : "Your listing is hidden from search until you reactivate it.",
    });
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : isPaused ? (
        <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
      ) : (
        <PauseCircle className="mr-1.5 h-3.5 w-3.5" />
      )}
      {isPaused ? "Reactivate" : "Pause"}
    </Button>
  );
}
