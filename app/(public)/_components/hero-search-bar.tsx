"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Minus, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Self-contained homepage search bar. Built with plain inputs (no
 * `components/ui/popover` / `components/ui/calendar` dependency) so this page
 * compiles standalone regardless of whether the shared shadcn kit has those
 * primitives yet -- swap for the real date-range popover once it lands.
 */
export function HeroSearchBar() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(1);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (location.trim()) params.set("location", location.trim());
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    params.set("adults", String(adults));
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-4xl flex-col gap-3 rounded-2xl border border-white/20 bg-white/95 p-4 shadow-2xl backdrop-blur sm:flex-row sm:items-end sm:gap-2 sm:p-3"
    >
      <div className="flex-1 text-left">
        <Label htmlFor="hero-search-location" className="text-brand-ink/70">
          Where to
        </Label>
        <Input
          id="hero-search-location"
          name="location"
          placeholder="Search destinations"
          autoComplete="off"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          className="border-0 bg-transparent px-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      <div className="hidden h-10 w-px bg-border sm:block" aria-hidden="true" />

      <div className="flex-1 text-left">
        <Label htmlFor="hero-search-checkin" className="flex items-center gap-1 text-brand-ink/70">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          Check-in
        </Label>
        <Input
          id="hero-search-checkin"
          name="checkIn"
          type="date"
          value={checkIn}
          onChange={(event) => setCheckIn(event.target.value)}
          className="border-0 bg-transparent px-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      <div className="hidden h-10 w-px bg-border sm:block" aria-hidden="true" />

      <div className="flex-1 text-left">
        <Label htmlFor="hero-search-checkout" className="flex items-center gap-1 text-brand-ink/70">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          Check-out
        </Label>
        <Input
          id="hero-search-checkout"
          name="checkOut"
          type="date"
          value={checkOut}
          min={checkIn || undefined}
          onChange={(event) => setCheckOut(event.target.value)}
          className="border-0 bg-transparent px-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      <div className="hidden h-10 w-px bg-border sm:block" aria-hidden="true" />

      <div className="flex-1 text-left">
        <span className="block text-sm font-medium text-brand-ink/70">Guests</span>
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            aria-label="Decrease guest count"
            onClick={() => setAdults((n) => Math.max(1, n - 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-input text-brand-ink transition-colors hover:bg-accent disabled:opacity-40"
            disabled={adults <= 1}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-6 text-center text-sm tabular-nums" aria-live="polite">
            {adults}
          </span>
          <button
            type="button"
            aria-label="Increase guest count"
            onClick={() => setAdults((n) => Math.min(16, n + 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-input text-brand-ink transition-colors hover:bg-accent disabled:opacity-40"
            disabled={adults >= 16}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <Button type="submit" size="lg" className="gap-2 sm:self-center">
        <Search className="h-4 w-4" aria-hidden="true" />
        Search
      </Button>
    </form>
  );
}
