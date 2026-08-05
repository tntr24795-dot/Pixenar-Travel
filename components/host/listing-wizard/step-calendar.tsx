"use client";

import { AvailabilityCalendar, type DayOverride } from "@/components/host/availability-calendar";
import type { ListingWizardData } from "@/components/host/listing-wizard/types";

interface StepCalendarProps {
  data: ListingWizardData;
  update: (patch: Partial<ListingWizardData>) => void;
}

export function StepCalendar({ data, update }: StepCalendarProps) {
  function handleChange(date: string, patch: DayOverride | null) {
    const next = { ...data.availabilityOverrides };
    if (patch === null) {
      delete next[date];
    } else {
      next[date] = { ...patch, date };
    }
    update({ availabilityOverrides: next });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Set your availability</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything defaults to available at your base price. Block dates or set custom
          pricing for specific days — you can always fine-tune this later from your calendar.
        </p>
      </div>
      <AvailabilityCalendar
        basePriceCents={data.basePriceCents}
        defaultMinimumNights={data.minimumNights}
        overrides={data.availabilityOverrides}
        onChange={handleChange}
      />
    </div>
  );
}
