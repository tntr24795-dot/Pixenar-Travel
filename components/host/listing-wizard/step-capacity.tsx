"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ListingWizardData } from "@/components/host/listing-wizard/types";

interface StepCapacityProps {
  data: ListingWizardData;
  update: (patch: Partial<ListingWizardData>) => void;
}

interface StepperRowProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

function StepperRow({ label, description, value, min, max, step = 1, onChange }: StepperRowProps) {
  return (
    <div className="flex items-center justify-between border-b border-border py-4 last:border-b-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, Number((value - step).toFixed(1))))}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-6 text-center text-sm font-medium">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, Number((value + step).toFixed(1))))}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function StepCapacity({ data, update }: StepCapacityProps) {
  return (
    <div className="space-y-2">
      <h2 className="font-display text-xl font-semibold">Share some basics about your place</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        You'll add specific amenities and details next.
      </p>

      <div className="rounded-lg border border-border px-4">
        <StepperRow
          label="Guests"
          description="Maximum number of guests allowed"
          value={data.maximumGuests}
          min={1}
          max={50}
          onChange={(v) => update({ maximumGuests: v })}
        />
        <StepperRow
          label="Bedrooms"
          description="Number of bedrooms"
          value={data.bedrooms}
          min={0}
          max={50}
          onChange={(v) => update({ bedrooms: v })}
        />
        <StepperRow
          label="Beds"
          description="Number of beds"
          value={data.beds}
          min={0}
          max={50}
          onChange={(v) => update({ beds: v })}
        />
        <StepperRow
          label="Bathrooms"
          description="Number of bathrooms"
          value={data.bathrooms}
          min={0}
          max={50}
          step={0.5}
          onChange={(v) => update({ bathrooms: v })}
        />
      </div>
    </div>
  );
}
