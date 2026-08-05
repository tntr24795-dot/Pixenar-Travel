"use client";

// Mount this on listing detail pages and search result cards wherever a
// listing is shown, so travelers can save/unsave it to their default
// wishlist. Owned here per the account-section build; the listing-detail and
// search-card components are owned by other agents — they should import and
// render <SaveButton listingId={...} /> rather than reimplementing this.

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SaveButtonProps {
  listingId: string;
  className?: string;
}

const DEFAULT_WISHLIST_NAME = "My Wishlist";

export function SaveButton({ listingId, className }: SaveButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkSaved() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      const { data: wishlists } = await supabase
        .from("wishlists")
        .select("id")
        .eq("user_id", user.id);

      const wishlistIds = (wishlists ?? []).map((w) => w.id);
      if (wishlistIds.length === 0) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      const { data: item } = await supabase
        .from("wishlist_items")
        .select("wishlist_id")
        .in("wishlist_id", wishlistIds)
        .eq("listing_id", listingId)
        .maybeSingle();

      if (!cancelled) {
        setIsSaved(!!item);
        setIsLoading(false);
      }
    }

    checkSaved();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  async function toggle() {
    setIsToggling(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      // Find or lazily create the user's default wishlist.
      let { data: wishlist } = await supabase
        .from("wishlists")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!wishlist) {
        const { data: created, error } = await supabase
          .from("wishlists")
          .insert({ user_id: user.id, name: DEFAULT_WISHLIST_NAME })
          .select("id")
          .single();
        if (error) throw error;
        wishlist = created;
      }

      if (!wishlist) {
        throw new Error("Couldn't find or create a wishlist.");
      }

      if (isSaved) {
        const { error } = await supabase
          .from("wishlist_items")
          .delete()
          .eq("wishlist_id", wishlist.id)
          .eq("listing_id", listingId);
        if (error) throw error;
        setIsSaved(false);
      } else {
        const { error } = await supabase
          .from("wishlist_items")
          .insert({ wishlist_id: wishlist.id, listing_id: listingId });
        if (error) throw error;
        setIsSaved(true);
      }
    } catch (err) {
      // Swallow — a toast provider isn't guaranteed to be mounted wherever
      // this button ends up; failing silently just leaves the heart unchanged.
      console.error("Failed to toggle wishlist item", err);
    } finally {
      setIsToggling(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggle}
      disabled={isLoading || isToggling}
      aria-pressed={isSaved}
      aria-label={isSaved ? "Remove from wishlist" : "Save to wishlist"}
      className={cn("rounded-full", className)}
    >
      <Heart className={cn("h-4 w-4", isSaved && "fill-primary text-primary")} />
    </Button>
  );
}
