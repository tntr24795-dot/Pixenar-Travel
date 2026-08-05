"use client";

// This page is a Client Component (rather than the default Server Component)
// because every bit of it is user-specific, mutable state: lazily creating a
// default wishlist, loading its items, and removing them — all via direct
// Supabase calls covered by the `wishlists_owner_all` / `wishlist_items_owner_all`
// RLS policies (owner-CRUD, no server route needed).

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { formatCents } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";

const DEFAULT_WISHLIST_NAME = "My Wishlist";

interface WishlistListing {
  id: string;
  title: string;
  slug: string;
  city: string | null;
  state: string | null;
  base_price_cents: number;
  currency: string;
  coverUrl: string | null;
}

export default function WishlistPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [wishlistId, setWishlistId] = useState<string | null>(null);
  const [listings, setListings] = useState<WishlistListing[]>([]);

  const load = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsLoading(false);
      return;
    }

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
      if (error) {
        toast({ title: "Couldn't load your wishlist", description: error.message, variant: "destructive" });
        setIsLoading(false);
        return;
      }
      wishlist = created;
    }

    if (!wishlist) {
      setIsLoading(false);
      return;
    }

    setWishlistId(wishlist.id);

    const { data: items } = await supabase
      .from("wishlist_items")
      .select("listing_id")
      .eq("wishlist_id", wishlist.id);

    const listingIds = (items ?? []).map((i) => i.listing_id);

    if (listingIds.length === 0) {
      setListings([]);
      setIsLoading(false);
      return;
    }

    const [{ data: listingRows }, { data: images }] = await Promise.all([
      supabase
        .from("listings")
        .select("id, title, slug, city, state, base_price_cents, currency")
        .in("id", listingIds),
      supabase
        .from("listing_images")
        .select("listing_id, public_url, is_cover, sort_order")
        .in("listing_id", listingIds)
        .order("sort_order", { ascending: true }),
    ]);

    const coverByListing = new Map<string, string>();
    for (const img of images ?? []) {
      if (img.is_cover || !coverByListing.has(img.listing_id)) {
        coverByListing.set(img.listing_id, img.public_url);
      }
    }

    setListings(
      (listingRows ?? []).map((l) => ({
        ...l,
        coverUrl: coverByListing.get(l.id) ?? null,
      }))
    );
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(listingId: string) {
    if (!wishlistId) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("wishlist_items")
      .delete()
      .eq("wishlist_id", wishlistId)
      .eq("listing_id", listingId);

    if (error) {
      toast({ title: "Couldn't remove listing", description: error.message, variant: "destructive" });
      return;
    }
    setListings((prev) => prev.filter((l) => l.id !== listingId));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Wishlist</h1>
        <p className="text-muted-foreground">Places you've saved for later.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <Heart className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            No saved listings yet. Tap the heart on any listing to save it here.
          </p>
          <Button asChild variant="secondary">
            <Link href="/search">Explore listings</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <Card key={listing.id} className="overflow-hidden">
              <div className="relative aspect-[4/3] w-full bg-muted">
                <Link href={`/listing/${listing.slug}`}>
                  {listing.coverUrl ? (
                    <Image
                      src={listing.coverUrl}
                      alt={listing.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                      No photo
                    </div>
                  )}
                </Link>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-2 rounded-full"
                  onClick={() => remove(listing.id)}
                  aria-label="Remove from wishlist"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardContent className="space-y-1 p-4">
                <Link href={`/listing/${listing.slug}`} className="line-clamp-1 font-medium hover:underline">
                  {listing.title}
                </Link>
                {listing.city && (
                  <p className="text-xs text-muted-foreground">
                    {listing.city}
                    {listing.state ? `, ${listing.state}` : ""}
                  </p>
                )}
                <p className="text-sm font-medium">
                  {formatCents(listing.base_price_cents, listing.currency)}{" "}
                  <span className="font-normal text-muted-foreground">/ night</span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
