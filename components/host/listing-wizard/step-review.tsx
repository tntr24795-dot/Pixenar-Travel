"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";

import { formatCents } from "@/lib/utils";
import { PROPERTY_TYPES, ROOM_TYPES, CANCELLATION_POLICIES } from "@/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ListingWizardData } from "@/components/host/listing-wizard/types";

interface StepReviewProps {
  data: ListingWizardData;
  mode: "create" | "edit";
  submitting: boolean;
  onSubmit: () => void;
}

function label(options: readonly { value: string; label: string }[], value: string) {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function StepReview({ data, mode, submitting, onSubmit }: StepReviewProps) {
  const overrideCount = Object.keys(data.availabilityOverrides).length;
  const blockedCount = Object.values(data.availabilityOverrides).filter(
    (o) => o.status === "blocked"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Review your listing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "create"
            ? "Once submitted, your listing goes to pending review — our team checks it before it goes live."
            : "Save your changes below."}
        </p>
      </div>

      {data.images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {data.images
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((img) => (
              <div key={img.clientId} className="relative aspect-square overflow-hidden rounded-md">
                <Image src={img.publicUrl} alt={img.altText || "Listing photo"} fill sizes="150px" className="object-cover" unoptimized />
              </div>
            ))}
        </div>
      )}

      <dl className="grid gap-x-6 gap-y-3 rounded-lg border border-border p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Title</dt>
          <dd className="font-medium">{data.title || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Property / room type</dt>
          <dd className="font-medium">
            {label(PROPERTY_TYPES, data.propertyType)} · {label(ROOM_TYPES, data.roomType)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Address</dt>
          <dd className="font-medium">
            {data.addressLine1}, {data.city}, {data.state} {data.postalCode}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Capacity</dt>
          <dd className="font-medium">
            {data.maximumGuests} guests · {data.bedrooms} bed{data.bedrooms === 1 ? "" : "s"} ·{" "}
            {data.beds} bed{data.beds === 1 ? "" : "s"} · {data.bathrooms} bath
            {data.bathrooms === 1 ? "" : "s"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Base price</dt>
          <dd className="font-medium">{formatCents(data.basePriceCents)} / night</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Cleaning fee</dt>
          <dd className="font-medium">{formatCents(data.cleaningFeeCents)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Cancellation policy</dt>
          <dd className="font-medium">{label(CANCELLATION_POLICIES, data.cancellationPolicy)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Amenities</dt>
          <dd className="font-medium">{data.amenityIds.length} selected</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Calendar customizations</dt>
          <dd className="font-medium">
            {overrideCount === 0
              ? "Fully available at base price"
              : `${overrideCount} day${overrideCount === 1 ? "" : "s"} customized (${blockedCount} blocked)`}
          </dd>
        </div>
      </dl>

      {mode === "create" && (
        <Badge variant="secondary" className="text-xs">
          Will be submitted with status: pending_review
        </Badge>
      )}

      <Button type="button" size="lg" className="w-full" onClick={onSubmit} disabled={submitting}>
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {mode === "create" ? "Submit for review" : "Save changes"}
      </Button>
    </div>
  );
}
