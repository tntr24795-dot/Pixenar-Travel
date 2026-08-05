"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isBefore,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn, formatCents } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface DayOverride {
  status: "available" | "blocked";
  customPriceCents: number | null;
  minimumNights: number | null;
}

export interface AvailabilityCalendarProps {
  /** The listing's default nightly price, used when a day has no override. */
  basePriceCents: number;
  /** The listing's default minimum-nights, used when a day has no override. */
  defaultMinimumNights?: number;
  currency?: string;
  /**
   * Only dates that differ from "available at the default price" need an
   * entry here — keyed by ISO date (yyyy-MM-dd).
   */
  overrides: Record<string, DayOverride>;
  /** Called with `null` to clear an override back to the default. */
  onChange: (date: string, patch: DayOverride | null) => void;
  /**
   * Dates already tied to a confirmed/pending booking (`availability.status
   * = 'booked'`). These are never editable here — bookings own that row via
   * `booking_id`, and this UI must never clear or overwrite it.
   */
  bookedDates?: Set<string>;
  className?: string;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function AvailabilityCalendar({
  basePriceCents,
  defaultMinimumNights = 1,
  currency = "USD",
  overrides,
  onChange,
  bookedDates,
  className,
}: AvailabilityCalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const days = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end });
  }, [month]);

  const leadingBlanks = getDay(startOfMonth(month));
  const today = startOfDay(new Date());

  function getOverride(dateKey: string): DayOverride {
    return (
      overrides[dateKey] ?? {
        status: "available",
        customPriceCents: null,
        minimumNights: null,
      }
    );
  }

  const selected = selectedDate ? getOverride(selectedDate) : null;

  function commitSelected(patch: Partial<DayOverride>) {
    if (!selectedDate) return;
    const current = getOverride(selectedDate);
    const next: DayOverride = { ...current, ...patch };

    const isDefault =
      next.status === "available" && next.customPriceCents == null && next.minimumNights == null;

    onChange(selectedDate, isDefault ? null : next);
  }

  return (
    <div className={cn("grid gap-6 lg:grid-cols-[1fr_280px]", className)}>
      <div>
        <div className="mb-4 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="font-display text-lg font-semibold">{format(month, "MMMM yyyy")}</p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={i} className="py-1">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const override = getOverride(dateKey);
            const isPast = isBefore(day, today);
            const isBooked = bookedDates?.has(dateKey) ?? false;
            const isBlocked = override.status === "blocked";
            const isSelected = selectedDate === dateKey;
            const price = override.customPriceCents ?? basePriceCents;
            const isDisabled = isPast || isBooked;

            return (
              <button
                type="button"
                key={dateKey}
                disabled={isDisabled}
                onClick={() => setSelectedDate(dateKey)}
                title={isBooked ? "Already booked — manage via Reservations" : undefined}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-md border text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  isBooked
                    ? "border-havena-teal/40 bg-havena-teal/10 text-havena-teal"
                    : isBlocked
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-border hover:border-primary/50",
                  isSelected && "ring-2 ring-primary"
                )}
              >
                <span className="font-medium">{format(day, "d")}</span>
                {!isPast && (
                  <span className="text-[10px] text-muted-foreground">
                    {isBooked ? "Booked" : isBlocked ? "Blocked" : formatCents(price, currency)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border p-4">
        {selectedDate ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold">{format(new Date(`${selectedDate}T00:00:00`), "EEEE, MMMM d, yyyy")}</p>
            </div>

            <Button
              type="button"
              variant={selected?.status === "blocked" ? "secondary" : "destructive"}
              size="sm"
              className="w-full"
              onClick={() =>
                commitSelected({
                  status: selected?.status === "blocked" ? "available" : "blocked",
                })
              }
            >
              {selected?.status === "blocked" ? "Make available" : "Block this date"}
            </Button>

            <div className="space-y-1.5">
              <Label htmlFor="custom-price">Custom price (optional)</Label>
              <Input
                id="custom-price"
                type="number"
                min={0}
                step="0.01"
                placeholder={(basePriceCents / 100).toFixed(2)}
                value={selected?.customPriceCents != null ? (selected.customPriceCents / 100).toString() : ""}
                onChange={(e) =>
                  commitSelected({
                    customPriceCents: e.target.value === "" ? null : Math.round(Number(e.target.value) * 100),
                  })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custom-min-nights">Minimum nights override (optional)</Label>
              <Input
                id="custom-min-nights"
                type="number"
                min={1}
                placeholder={String(defaultMinimumNights)}
                value={selected?.minimumNights != null ? String(selected.minimumNights) : ""}
                onChange={(e) =>
                  commitSelected({
                    minimumNights: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a date to block it or set a custom price / minimum stay.
          </p>
        )}
      </div>
    </div>
  );
}
