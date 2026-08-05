"use client";

import { PROPERTY_TYPES, ROOM_TYPES } from "@/constants";
import { cn } from "@/lib/utils";
import type { ListingWizardData } from "@/components/host/listing-wizard/types";

interface StepTypeProps {
  data: ListingWizardData;
  update: (patch: Partial<ListingWizardData>) => void;
}

export function StepType({ data, update }: StepTypeProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-xl font-semibold">What kind of place is it?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick the property type that best describes your listing.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PROPERTY_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => update({ propertyType: type.value })}
              className={cn(
                "rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors",
                data.propertyType === type.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl font-semibold">What will guests have?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how much of the space guests get access to.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {ROOM_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => update({ roomType: type.value })}
              className={cn(
                "rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors",
                data.roomType === type.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
