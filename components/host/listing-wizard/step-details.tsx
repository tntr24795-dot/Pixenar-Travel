"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

import { slugify } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { ListingWizardData } from "@/components/host/listing-wizard/types";

interface StepDetailsProps {
  data: ListingWizardData;
  update: (patch: Partial<ListingWizardData>) => void;
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 6);
}

export function StepDetails({ data, update }: StepDetailsProps) {
  const [slugTouched, setSlugTouched] = useState(Boolean(data.slug));

  function handleTitleChange(title: string) {
    const patch: Partial<ListingWizardData> = { title };
    // Auto-suggest a slug from the title until the host edits it directly.
    // A short random suffix is appended for MVP since checking uniqueness
    // against the database isn't required — this makes collisions unlikely.
    if (!slugTouched) {
      patch.slug = title.trim() ? `${slugify(title)}-${randomSuffix()}` : "";
    }
    update(patch);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Now, let's give your listing a title</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Short, memorable titles work best. You can always change these later.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          maxLength={100}
          value={data.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Sunny loft with rooftop views"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="slug">URL slug</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => {
              setSlugTouched(false);
              update({ slug: data.title.trim() ? `${slugify(data.title)}-${randomSuffix()}` : "" });
            }}
          >
            <RefreshCw className="mr-1 h-3 w-3" /> Regenerate
          </Button>
        </div>
        <Input
          id="slug"
          value={data.slug}
          onChange={(e) => {
            setSlugTouched(true);
            update({ slug: slugify(e.target.value) });
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="shortDescription">Short description (optional)</Label>
        <Textarea
          id="shortDescription"
          maxLength={300}
          value={data.shortDescription}
          onChange={(e) => update({ shortDescription: e.target.value })}
          placeholder="A one-line teaser shown in search results"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Full description</Label>
        <Textarea
          id="description"
          rows={6}
          value={data.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Tell guests what makes your place special..."
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="houseRules">House rules (optional)</Label>
        <Textarea
          id="houseRules"
          rows={4}
          value={data.houseRules}
          onChange={(e) => update({ houseRules: e.target.value })}
          placeholder="No smoking, quiet hours after 10pm..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="checkInTime">Check-in time</Label>
          <Input
            id="checkInTime"
            type="time"
            value={data.checkInTime}
            onChange={(e) => update({ checkInTime: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="checkOutTime">Check-out time</Label>
          <Input
            id="checkOutTime"
            type="time"
            value={data.checkOutTime}
            onChange={(e) => update({ checkOutTime: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="minimumNights">Minimum nights</Label>
          <Input
            id="minimumNights"
            type="number"
            min={1}
            value={data.minimumNights}
            onChange={(e) => update({ minimumNights: Number(e.target.value) || 1 })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="maximumNights">Maximum nights</Label>
          <Input
            id="maximumNights"
            type="number"
            min={1}
            value={data.maximumNights}
            onChange={(e) => update({ maximumNights: Number(e.target.value) || 1 })}
          />
        </div>
      </div>
    </div>
  );
}
