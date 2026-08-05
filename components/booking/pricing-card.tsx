"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { formatCents } from "@/lib/utils";
import type { BookingQuote, QuoteResult } from "@/lib/pricing/calculateBookingQuote";

export interface PricingCardProps {
  listingId: string;
  currency: string;
  basePriceCents: number;
  maximumGuests: number;
  minimumNights: number;
  maximumNights: number;
}

const REASON_MESSAGES: Record<string, string> = {
  blocked_dates: "Those dates aren't available — try a different range.",
  minimum_nights_not_met: "The host requires a longer minimum stay for these dates.",
  invalid_date_range: "Pick a valid check-in and check-out date.",
  exceeds_maximum_guests: "This place can't fit that many guests.",
  unavailable: "These dates aren't available for this listing.",
};

function reasonMessage(reason: string): string {
  if (REASON_MESSAGES[reason]) return REASON_MESSAGES[reason];
  if (reason.startsWith("minimum_stay_")) {
    const nights = reason.replace("minimum_stay_", "").replace("_nights", "");
    return `This listing requires a minimum stay of ${nights} nights.`;
  }
  if (reason.startsWith("maximum_stay_")) {
    const nights = reason.replace("maximum_stay_", "").replace("_nights", "");
    return `This listing allows a maximum stay of ${nights} nights.`;
  }
  return "These dates aren't available for this listing.";
}

/**
 * Client Component pricing card for the listing detail page: date range +
 * guest steppers, debounced call to POST /api/listings/[id]/quote, the exact
 * line-item breakdown from the client's spec (using formatCents() for every
 * line), and a Reserve button.
 *
 * ASSUMPTION (for the booking-flow agent): Reserve navigates to
 *   /checkout/[listingId]?checkIn=&checkOut=&adults=&children=&infants=&pets=
 * with ISO (yyyy-MM-dd) dates and plain integer guest counts. Match this
 * query contract exactly on the checkout page.
 */
export function PricingCard({
  listingId,
  currency,
  basePriceCents,
  maximumGuests,
}: PricingCardProps) {
  const router = useRouter();
  const [range, setRange] = React.useState<DateRange | undefined>();
  const [adults, setAdults] = React.useState(1);
  const [children, setChildren] = React.useState(0);
  const [infants, setInfants] = React.useState(0);
  const [pets, setPets] = React.useState(0);

  const [quote, setQuote] = React.useState<QuoteResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const checkIn = range?.from ? format(range.from, "yyyy-MM-dd") : undefined;
  const checkOut = range?.to ? format(range.to, "yyyy-MM-dd") : undefined;

  React.useEffect(() => {
    if (!checkIn || !checkOut) {
      setQuote(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/listings/${listingId}/quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkIn, checkOut, adults, children, infants, pets }),
          signal: controller.signal,
        });
        const responseBody = await res.json();
        if (res.status === 409) {
          setQuote({ available: false, reason: responseBody.reason ?? "unavailable" });
        } else if (!res.ok) {
          setError("Couldn't calculate a price for these dates. Please try again.");
          setQuote(null);
        } else {
          setQuote(responseBody as BookingQuote);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Couldn't calculate a price for these dates. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }, 400); // debounce

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [listingId, checkIn, checkOut, adults, children, infants, pets]);

  const canReserve = quote?.available === true && !loading;

  function handleReserve() {
    if (!quote || quote.available !== true || !checkIn || !checkOut) return;
    const params = new URLSearchParams({
      checkIn,
      checkOut,
      adults: String(adults),
      children: String(children),
      infants: String(infants),
      pets: String(pets),
    });
    router.push(`/checkout/${listingId}?${params.toString()}`);
  }

  const guestSteppers = [
    { label: "Adults", value: adults, setValue: setAdults, min: 1 },
    { label: "Children", value: children, setValue: setChildren, min: 0 },
    { label: "Infants", value: infants, setValue: setInfants, min: 0 },
    { label: "Pets", value: pets, setValue: setPets, min: 0 },
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <p className="text-lg">
        <span className="font-semibold">{formatCents(basePriceCents, currency)}</span>{" "}
        <span className="text-sm text-muted-foreground">/ night</span>
      </p>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start gap-2 font-normal">
            <CalendarIcon className="h-4 w-4" />
            {checkIn && checkOut ? `${checkIn} → ${checkOut}` : "Select dates"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={range}
            onSelect={setRange}
            numberOfMonths={2}
            disabled={{ before: new Date() }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start font-normal">
            {adults + children} guest{adults + children === 1 ? "" : "s"}
            {pets > 0 ? `, ${pets} pet${pets === 1 ? "" : "s"}` : ""}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-4" align="start">
          {guestSteppers.map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <span className="text-sm font-medium">{s.label}</span>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => s.setValue(Math.max(s.min, s.value - 1))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-4 text-center text-sm">{s.value}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => s.setValue(s.value + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">This place hosts up to {maximumGuests} guests.</p>
        </PopoverContent>
      </Popover>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {quote && quote.available === false && (
        <p className="text-sm text-destructive">{reasonMessage(quote.reason)}</p>
      )}

      {quote && quote.available === true && (
        <div className="space-y-2 pt-2 text-sm">
          {quote.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-foreground/90">{item.description}</span>
              <span>{formatCents(item.totalAmountCents, quote.currency)}</span>
            </div>
          ))}
          <Separator />
          <div className="flex items-center justify-between font-semibold">
            <span>Total</span>
            <span>{formatCents(quote.totalCents, quote.currency)}</span>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-muted-foreground">Calculating price…</p>}

      <Button className="w-full" size="lg" disabled={!canReserve} onClick={handleReserve}>
        {checkIn && checkOut ? "Reserve" : "Check availability"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">You won't be charged yet.</p>
    </div>
  );
}
