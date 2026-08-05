"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tables } from "@/types/database";
import type { ListingWizardData } from "@/components/host/listing-wizard/types";

interface StepAmenitiesProps {
  data: ListingWizardData;
  update: (patch: Partial<ListingWizardData>) => void;
}

type Amenity = Tables<"amenities">;

export function StepAmenities({ data, update }: StepAmenitiesProps) {
  const [amenities, setAmenities] = useState<Amenity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase
      .from("amenities")
      .select("*")
      .order("category")
      .order("name")
      .then(({ data: rows, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          setError(fetchError.message);
          return;
        }
        setAmenities(rows ?? []);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Amenity[]>();
    for (const amenity of amenities ?? []) {
      const list = map.get(amenity.category) ?? [];
      list.push(amenity);
      map.set(amenity.category, list);
    }
    return map;
  }, [amenities]);

  function toggle(id: string) {
    const has = data.amenityIds.includes(id);
    update({
      amenityIds: has
        ? data.amenityIds.filter((existing) => existing !== id)
        : [...data.amenityIds, id],
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">What does your place offer?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select all the amenities available to guests.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Couldn't load amenities: {error}
        </p>
      )}

      {!amenities && !error && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {amenities && amenities.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No amenities have been configured yet — you can skip this step.
        </p>
      )}

      <div className="space-y-6">
        {Array.from(grouped.entries()).map(([category, items]) => (
          <div key={category}>
            <h3 className="mb-2 text-sm font-semibold capitalize text-muted-foreground">
              {category}
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {items.map((amenity) => {
                const checked = data.amenityIds.includes(amenity.id);
                return (
                  <label
                    key={amenity.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                      checked ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                    )}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggle(amenity.id)} />
                    {amenity.name}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
