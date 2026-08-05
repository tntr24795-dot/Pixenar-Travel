"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROPERTY_TYPES, ROOM_TYPES, AMENITY_ICON_MAP } from "@/constants";
import { cn } from "@/lib/utils";

const FILTER_PARAM_KEYS = [
  "minPrice",
  "maxPrice",
  "propertyType",
  "roomType",
  "bedrooms",
  "beds",
  "bathrooms",
  "instantBook",
  "amenities",
  "page",
] as const;

function Stepper({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-4 text-center text-sm">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onChange(value + 1)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export interface FiltersProps {
  className?: string;
}

/**
 * Search filters sidebar/bar -- price range, property/room type, bed/bath
 * steppers, instant book, and amenity checkboxes. Applies by pushing a new
 * `/search?...` URL; the Server Component page re-runs `searchListings()`.
 */
export function Filters({ className }: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [minPrice, setMinPrice] = React.useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = React.useState(searchParams.get("maxPrice") ?? "");
  const [propertyType, setPropertyType] = React.useState(searchParams.get("propertyType") ?? "any");
  const [roomType, setRoomType] = React.useState(searchParams.get("roomType") ?? "any");
  const [bedrooms, setBedrooms] = React.useState(Number(searchParams.get("bedrooms") ?? 0) || 0);
  const [beds, setBeds] = React.useState(Number(searchParams.get("beds") ?? 0) || 0);
  const [bathrooms, setBathrooms] = React.useState(Number(searchParams.get("bathrooms") ?? 0) || 0);
  const [instantBook, setInstantBook] = React.useState(searchParams.get("instantBook") === "true");
  const [amenities, setAmenities] = React.useState<string[]>(searchParams.getAll("amenities"));

  function toggleAmenity(name: string) {
    setAmenities((prev) => (prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]));
  }

  function apply() {
    const params = new URLSearchParams(searchParams.toString());
    FILTER_PARAM_KEYS.forEach((key) => params.delete(key));

    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (propertyType !== "any") params.set("propertyType", propertyType);
    if (roomType !== "any") params.set("roomType", roomType);
    if (bedrooms > 0) params.set("bedrooms", String(bedrooms));
    if (beds > 0) params.set("beds", String(beds));
    if (bathrooms > 0) params.set("bathrooms", String(bathrooms));
    if (instantBook) params.set("instantBook", "true");
    amenities.forEach((a) => params.append("amenities", a));

    router.push(`/search?${params.toString()}`);
  }

  function clearAll() {
    setMinPrice("");
    setMaxPrice("");
    setPropertyType("any");
    setRoomType("any");
    setBedrooms(0);
    setBeds(0);
    setBathrooms(0);
    setInstantBook(false);
    setAmenities([]);

    const params = new URLSearchParams(searchParams.toString());
    FILTER_PARAM_KEYS.forEach((key) => params.delete(key));
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className={cn("space-y-6 rounded-2xl border border-border bg-card p-4", className)}>
      <div className="space-y-2">
        <Label>Price range (per night)</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Min"
            aria-label="Minimum price"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Max"
            aria-label="Maximum price"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">In whole cents (e.g. 10000 = $100).</p>
      </div>

      <div className="space-y-2">
        <Label>Property type</Label>
        <Select value={propertyType} onValueChange={setPropertyType}>
          <SelectTrigger>
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            {PROPERTY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Room type</Label>
        <Select value={roomType} onValueChange={setRoomType}>
          <SelectTrigger>
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            {ROOM_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Stepper label="Bedrooms" value={bedrooms} onChange={setBedrooms} />
        <Stepper label="Beds" value={beds} onChange={setBeds} />
        <Stepper label="Bathrooms" value={bathrooms} onChange={setBathrooms} />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="instant-book">Instant Book</Label>
        <Switch id="instant-book" checked={instantBook} onCheckedChange={setInstantBook} />
      </div>

      <div className="space-y-2">
        <Label>Amenities</Label>
        <div className="grid grid-cols-1 gap-2">
          {Object.keys(AMENITY_ICON_MAP).map((name) => (
            <label key={name} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={amenities.includes(name)}
                onCheckedChange={() => toggleAmenity(name)}
              />
              {name}
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={clearAll}>
          Clear all
        </Button>
        <Button type="button" className="flex-1" onClick={apply}>
          Apply filters
        </Button>
      </div>
    </div>
  );
}
