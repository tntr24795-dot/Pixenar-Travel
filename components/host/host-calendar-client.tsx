"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { AvailabilityCalendar, type DayOverride } from "@/components/host/availability-calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

export interface HostCalendarListing {
  id: string;
  title: string;
  base_price_cents: number;
  minimum_nights: number;
  currency: string;
}

interface HostCalendarClientProps {
  listings: HostCalendarListing[];
}

export function HostCalendarClient({ listings }: HostCalendarClientProps) {
  const [selectedId, setSelectedId] = useState(listings[0]?.id ?? "");
  const [overrides, setOverrides] = useState<Record<string, DayOverride>>({});
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const selectedListing = listings.find((l) => l.id === selectedId);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setLoading(true);

    createClient()
      .from("availability")
      .select("*")
      .eq("listing_id", selectedId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast({ title: "Couldn't load calendar", description: error.message, variant: "destructive" });
          setLoading(false);
          return;
        }

        const nextOverrides: Record<string, DayOverride> = {};
        const nextBooked = new Set<string>();
        for (const row of data ?? []) {
          if (row.status === "booked") {
            nextBooked.add(row.date);
            continue;
          }
          if (row.status === "blocked" || row.custom_price_cents != null || row.minimum_nights != null) {
            nextOverrides[row.date] = {
              status: row.status === "blocked" ? "blocked" : "available",
              customPriceCents: row.custom_price_cents,
              minimumNights: row.minimum_nights,
            };
          }
        }
        setOverrides(nextOverrides);
        setBookedDates(nextBooked);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, toast]);

  async function handleChange(date: string, patch: DayOverride | null) {
    const supabase = createClient();
    const previous = overrides;

    // Optimistic update.
    setOverrides((prev) => {
      const next = { ...prev };
      if (patch === null) delete next[date];
      else next[date] = patch;
      return next;
    });

    if (patch === null) {
      const { error } = await supabase
        .from("availability")
        .delete()
        .eq("listing_id", selectedId)
        .eq("date", date);
      if (error) {
        setOverrides(previous);
        toast({ title: "Couldn't save change", description: error.message, variant: "destructive" });
      }
      return;
    }

    const { error } = await supabase.from("availability").upsert(
      {
        listing_id: selectedId,
        date,
        status: patch.status,
        custom_price_cents: patch.customPriceCents,
        minimum_nights: patch.minimumNights,
      },
      { onConflict: "listing_id,date" }
    );

    if (error) {
      setOverrides(previous);
      toast({ title: "Couldn't save change", description: error.message, variant: "destructive" });
    }
  }

  if (listings.length === 0) {
    return (
      <p className="rounded-md border border-border p-6 text-center text-sm text-muted-foreground">
        Create a listing first to manage its calendar.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {listings.length > 1 && (
        <div className="max-w-xs">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a listing" />
            </SelectTrigger>
            <SelectContent>
              {listings.map((listing) => (
                <SelectItem key={listing.id} value={listing.id}>
                  {listing.title || "Untitled listing"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : selectedListing ? (
        <AvailabilityCalendar
          basePriceCents={selectedListing.base_price_cents}
          defaultMinimumNights={selectedListing.minimum_nights}
          currency={selectedListing.currency}
          overrides={overrides}
          bookedDates={bookedDates}
          onChange={handleChange}
        />
      ) : null}
    </div>
  );
}
