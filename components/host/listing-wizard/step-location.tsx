"use client";

import { useState } from "react";
import { MapPin, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { ListingWizardData } from "@/components/host/listing-wizard/types";

interface StepLocationProps {
  data: ListingWizardData;
  update: (patch: Partial<ListingWizardData>) => void;
}

export function StepLocation({ data, update }: StepLocationProps) {
  const [looking, setLooking] = useState(false);
  const { toast } = useToast();

  async function handleLookup() {
    setLooking(true);
    try {
      const res = await fetch("/api/host/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error ?? "Could not find that address");
      }

      update({ latitude: payload.latitude, longitude: payload.longitude });
      toast({
        title: "Location found",
        description: payload.formattedAddress ?? "Coordinates updated.",
      });
    } catch (error) {
      toast({
        title: "Couldn't look up that address",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLooking(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Where's your place located?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your exact address is only shared with guests after they book.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={data.country}
            onChange={(e) => update({ country: e.target.value })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="addressLine1">Address line 1</Label>
          <Input
            id="addressLine1"
            value={data.addressLine1}
            onChange={(e) => update({ addressLine1: e.target.value })}
            placeholder="123 Main St"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="addressLine2">Address line 2 (optional)</Label>
          <Input
            id="addressLine2"
            value={data.addressLine2}
            onChange={(e) => update({ addressLine2: e.target.value })}
            placeholder="Apt, suite, unit..."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" value={data.city} onChange={(e) => update({ city: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state">State / region</Label>
          <Input
            id="state"
            value={data.state}
            onChange={(e) => update({ state: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="postalCode">Postal code</Label>
          <Input
            id="postalCode"
            value={data.postalCode}
            onChange={(e) => update({ postalCode: e.target.value })}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {data.latitude != null && data.longitude != null ? (
              <span>
                Coordinates: {data.latitude.toFixed(6)}, {data.longitude.toFixed(6)}
              </span>
            ) : (
              <span className="text-muted-foreground">No coordinates yet.</span>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLookup}
            disabled={looking || !data.addressLine1 || !data.city}
          >
            {looking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Look up coordinates
          </Button>
        </div>
      </div>
    </div>
  );
}
