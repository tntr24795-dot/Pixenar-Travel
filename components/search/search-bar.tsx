"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, MapPin, Minus, Plus, Search, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface GuestStepperConfig {
  label: string;
  value: number;
  setValue: (v: number) => void;
  min: number;
}

export interface SearchBarProps {
  className?: string;
}

/**
 * Top-of-page search bar for `/search` -- location, dates, guests. Reads its
 * initial values from the current URL search params and, on submit, pushes a
 * new `/search?...` URL (the Server Component page re-runs the shared
 * `searchListings()` query against the new params).
 */
export function SearchBar({ className }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [location, setLocation] = React.useState(searchParams.get("location") ?? "");
  const [range, setRange] = React.useState<DateRange | undefined>(() => {
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");
    if (!checkIn || !checkOut) return undefined;
    return { from: new Date(`${checkIn}T00:00:00`), to: new Date(`${checkOut}T00:00:00`) };
  });
  const [adults, setAdults] = React.useState(Number(searchParams.get("adults") ?? 1) || 1);
  const [children, setChildren] = React.useState(Number(searchParams.get("children") ?? 0) || 0);
  const [infants, setInfants] = React.useState(Number(searchParams.get("infants") ?? 0) || 0);
  const [pets, setPets] = React.useState(Number(searchParams.get("pets") ?? 0) || 0);

  // Both dropdowns are controlled (rather than letting Radix manage their
  // own open state) so they can be force-closed on scroll below. Without
  // this, scrolling the page while a dropdown is open leaves it visually
  // "stuck" on screen -- it doesn't reposition or close, so whatever page
  // content scrolls underneath it reads as overlapping, garbled text.
  const [datesOpen, setDatesOpen] = React.useState(false);
  const [guestsOpen, setGuestsOpen] = React.useState(false);

  React.useEffect(() => {
    if (!datesOpen && !guestsOpen) return;
    const closeAll = () => {
      setDatesOpen(false);
      setGuestsOpen(false);
    };
    window.addEventListener("scroll", closeAll, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", closeAll, { capture: true });
  }, [datesOpen, guestsOpen]);

  const guestSummary = React.useMemo(() => {
    const total = adults + children;
    if (total <= 0) return "Add guests";
    return `${total} guest${total === 1 ? "" : "s"}${pets > 0 ? `, ${pets} pet${pets === 1 ? "" : "s"}` : ""}`;
  }, [adults, children, pets]);

  const guestSteppers: GuestStepperConfig[] = [
    { label: "Adults", value: adults, setValue: setAdults, min: 1 },
    { label: "Children", value: children, setValue: setChildren, min: 0 },
    { label: "Infants", value: infants, setValue: setInfants, min: 0 },
    { label: "Pets", value: pets, setValue: setPets, min: 0 },
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());

    if (location) params.set("location", location);
    else params.delete("location");

    if (range?.from && range.to) {
      params.set("checkIn", format(range.from, "yyyy-MM-dd"));
      params.set("checkOut", format(range.to, "yyyy-MM-dd"));
    } else {
      params.delete("checkIn");
      params.delete("checkOut");
    }

    params.set("adults", String(Math.max(1, adults)));
    params.set("children", String(children));
    params.set("infants", String(infants));
    params.set("pets", String(pets));
    params.delete("page");

    router.push(`/search?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm md:flex-row md:items-center",
        className
      )}
    >
      <div className="flex flex-1 items-center gap-2 rounded-xl border border-input px-3 py-2">
        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Where to?"
          aria-label="Location"
          className="h-auto border-0 p-0 shadow-none focus-visible:ring-0"
        />
      </div>

      <Popover open={datesOpen} onOpenChange={setDatesOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="justify-start gap-2 font-normal">
            <CalendarIcon className="h-4 w-4" />
            {range?.from && range.to
              ? `${format(range.from, "MMM d")} – ${format(range.to, "MMM d")}`
              : "Add dates"}
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

      <Popover open={guestsOpen} onOpenChange={setGuestsOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="justify-start gap-2 font-normal">
            <Users className="h-4 w-4" />
            {guestSummary}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-4" align="start">
          {guestSteppers.map((stepper) => (
            <div key={stepper.label} className="flex items-center justify-between">
              <span className="text-sm font-medium">{stepper.label}</span>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => stepper.setValue(Math.max(stepper.min, stepper.value - 1))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-4 text-center text-sm">{stepper.value}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => stepper.setValue(stepper.value + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </PopoverContent>
      </Popover>

      <Button type="submit" size="lg" className="gap-2">
        <Search className="h-4 w-4" />
        Search
      </Button>
    </form>
  );
}
