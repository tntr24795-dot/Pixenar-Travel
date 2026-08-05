"use client";

import { CANCELLATION_POLICIES } from "@/constants";
import { cn } from "@/lib/utils";
import type { ListingWizardData } from "@/components/host/listing-wizard/types";

interface StepCancellationProps {
  data: ListingWizardData;
  update: (patch: Partial<ListingWizardData>) => void;
}

export function StepCancellation({ data, update }: StepCancellationProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Choose a cancellation policy</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This determines how much guests are refunded when they cancel.
        </p>
      </div>

      <div className="space-y-3">
        {CANCELLATION_POLICIES.map((policy) => (
          <label
            key={policy.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
              data.cancellationPolicy === policy.value
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
          >
            <input
              type="radio"
              name="cancellationPolicy"
              className="mt-1"
              checked={data.cancellationPolicy === policy.value}
              onChange={() => update({ cancellationPolicy: policy.value })}
            />
            <div>
              <p className="font-medium">{policy.label}</p>
              <p className="text-sm text-muted-foreground">{policy.description}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
