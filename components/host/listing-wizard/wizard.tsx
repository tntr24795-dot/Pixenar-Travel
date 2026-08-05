"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  listingStepAmenitiesSchema,
  listingStepCancellationSchema,
  listingStepCapacitySchema,
  listingStepDetailsSchema,
  listingStepImagesSchema,
  listingStepLocationSchema,
  listingStepPricingSchema,
  listingStepTypeSchema,
} from "@/lib/validation/schemas";
import type { TablesInsert } from "@/types/database";

import { Stepper } from "@/components/host/listing-wizard/stepper";
import { StepType } from "@/components/host/listing-wizard/step-type";
import { StepLocation } from "@/components/host/listing-wizard/step-location";
import { StepCapacity } from "@/components/host/listing-wizard/step-capacity";
import { StepAmenities } from "@/components/host/listing-wizard/step-amenities";
import { StepPhotos } from "@/components/host/listing-wizard/step-photos";
import { StepDetails } from "@/components/host/listing-wizard/step-details";
import { StepPricing } from "@/components/host/listing-wizard/step-pricing";
import { StepCancellation } from "@/components/host/listing-wizard/step-cancellation";
import { StepCalendar } from "@/components/host/listing-wizard/step-calendar";
import { StepReview } from "@/components/host/listing-wizard/step-review";
import {
  WIZARD_STEPS,
  createDefaultWizardData,
  type ListingWizardData,
} from "@/components/host/listing-wizard/types";

interface ListingWizardProps {
  mode: "create" | "edit";
  hostProfileId: string;
  /** Existing listing id in edit mode; also doubles as the storage-folder id in create mode. */
  listingId?: string;
  initialData?: ListingWizardData;
  /** Dates already tied to a booking — the calendar step must never edit these. */
  bookedDates?: string[];
}

function validateStep(stepId: string, data: ListingWizardData): string | null {
  try {
    switch (stepId) {
      case "type":
        listingStepTypeSchema.parse({ propertyType: data.propertyType, roomType: data.roomType });
        break;
      case "location":
        listingStepLocationSchema.parse({
          country: data.country,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2 || undefined,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          latitude: data.latitude,
          longitude: data.longitude,
        });
        break;
      case "capacity":
        listingStepCapacitySchema.parse({
          maximumGuests: data.maximumGuests,
          bedrooms: data.bedrooms,
          beds: data.beds,
          bathrooms: data.bathrooms,
        });
        break;
      case "amenities":
        listingStepAmenitiesSchema.parse({ amenityIds: data.amenityIds });
        break;
      case "photos":
        listingStepImagesSchema.parse({
          images: data.images.map((img) => ({
            storagePath: img.storagePath,
            publicUrl: img.publicUrl,
            altText: img.altText || undefined,
            sortOrder: img.sortOrder,
            isCover: img.isCover,
          })),
        });
        break;
      case "details":
        listingStepDetailsSchema.parse({
          title: data.title,
          shortDescription: data.shortDescription || undefined,
          description: data.description,
          houseRules: data.houseRules || undefined,
          checkInTime: data.checkInTime,
          checkOutTime: data.checkOutTime,
          minimumNights: data.minimumNights,
          maximumNights: data.maximumNights,
        });
        break;
      case "pricing":
        listingStepPricingSchema.parse({
          basePriceCents: data.basePriceCents,
          weekendPriceCents: data.weekendPriceCents,
          cleaningFeeCents: data.cleaningFeeCents,
          extraGuestFeeCents: data.extraGuestFeeCents,
          petFeeCents: data.petFeeCents,
          securityDepositCents: data.securityDepositCents,
          weeklyDiscountPercent: data.weeklyDiscountPercent,
          monthlyDiscountPercent: data.monthlyDiscountPercent,
        });
        break;
      case "cancellation":
        listingStepCancellationSchema.parse({ cancellationPolicy: data.cancellationPolicy });
        break;
      default:
        break;
    }
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues[0]?.message ?? "Please double-check this step.";
    }
    return "Please double-check this step.";
  }
}

/**
 * The listings table has a single `description` column — there's no
 * dedicated short-description / house-rules column — so we fold the
 * wizard's extra text fields into it with simple section headers rather
 * than losing what the host typed.
 */
function composeDescription(data: ListingWizardData): string {
  const parts = [
    data.shortDescription.trim(),
    data.description.trim(),
    data.houseRules.trim() ? `House rules:\n${data.houseRules.trim()}` : "",
  ].filter(Boolean);
  return parts.join("\n\n");
}

export function ListingWizard({
  mode,
  hostProfileId,
  listingId,
  initialData,
  bookedDates,
}: ListingWizardProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [draftId] = useState(() => listingId ?? crypto.randomUUID());
  const [data, setData] = useState<ListingWizardData>(initialData ?? createDefaultWizardData());
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [furthestStepIndex, setFurthestStepIndex] = useState(mode === "edit" ? WIZARD_STEPS.length - 1 : 0);
  const [submitting, setSubmitting] = useState(false);

  const bookedDateSet = useMemo(() => new Set(bookedDates ?? []), [bookedDates]);

  function update(patch: Partial<ListingWizardData>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  function goTo(index: number) {
    setCurrentStepIndex(index);
  }

  function handleNext() {
    const stepId = WIZARD_STEPS[currentStepIndex].id;
    const error = validateStep(stepId, data);
    if (error) {
      toast({ title: "Almost there", description: error, variant: "destructive" });
      return;
    }
    const next = Math.min(currentStepIndex + 1, WIZARD_STEPS.length - 1);
    setCurrentStepIndex(next);
    setFurthestStepIndex((f) => Math.max(f, next));
  }

  function handleBack() {
    setCurrentStepIndex((i) => Math.max(0, i - 1));
  }

  async function handleSubmit() {
    // Re-validate every step with a schema before writing anything.
    for (const step of WIZARD_STEPS) {
      const error = validateStep(step.id, data);
      if (error) {
        const idx = WIZARD_STEPS.findIndex((s) => s.id === step.id);
        setCurrentStepIndex(idx);
        toast({ title: `Fix "${step.label}"`, description: error, variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);
    const supabase = createClient();

    const listingRow: TablesInsert<"listings"> = {
      id: draftId,
      host_id: hostProfileId,
      title: data.title,
      slug: data.slug,
      description: composeDescription(data),
      property_type: data.propertyType,
      room_type: data.roomType,
      status: mode === "create" ? "pending_review" : undefined,
      country: data.country,
      address_line_1: data.addressLine1,
      address_line_2: data.addressLine2 || null,
      city: data.city,
      state: data.state,
      postal_code: data.postalCode,
      latitude: data.latitude,
      longitude: data.longitude,
      maximum_guests: data.maximumGuests,
      bedrooms: data.bedrooms,
      beds: data.beds,
      bathrooms: data.bathrooms,
      base_price_cents: data.basePriceCents,
      weekend_price_cents: data.weekendPriceCents,
      cleaning_fee_cents: data.cleaningFeeCents,
      extra_guest_fee_cents: data.extraGuestFeeCents,
      pet_fee_cents: data.petFeeCents,
      security_deposit_cents: data.securityDepositCents,
      weekly_discount_percent: data.weeklyDiscountPercent,
      monthly_discount_percent: data.monthlyDiscountPercent,
      minimum_nights: data.minimumNights,
      maximum_nights: data.maximumNights,
      check_in_time: data.checkInTime,
      check_out_time: data.checkOutTime,
      cancellation_policy: data.cancellationPolicy,
    };

    try {
      if (mode === "create") {
        const { error } = await supabase.from("listings").insert(listingRow);
        if (error) throw error;
      } else {
        const { id, host_id, status, ...updatePayload } = listingRow;
        const { error } = await supabase.from("listings").update(updatePayload).eq("id", draftId);
        if (error) throw error;
      }

      // Amenities: replace the full set (cheap, table only has two columns).
      const { error: deleteAmenitiesError } = await supabase
        .from("listing_amenities")
        .delete()
        .eq("listing_id", draftId);
      if (deleteAmenitiesError) throw deleteAmenitiesError;

      if (data.amenityIds.length > 0) {
        const { error: amenitiesError } = await supabase.from("listing_amenities").insert(
          data.amenityIds.map((amenityId) => ({ listing_id: draftId, amenity_id: amenityId }))
        );
        if (amenitiesError) throw amenitiesError;
      }

      // Images: replace the full set — the wizard's photo step is the
      // source of truth for ordering/cover selection at submit time.
      const { error: deleteImagesError } = await supabase
        .from("listing_images")
        .delete()
        .eq("listing_id", draftId);
      if (deleteImagesError) throw deleteImagesError;

      if (data.images.length > 0) {
        const { error: imagesError } = await supabase.from("listing_images").insert(
          data.images.map((img) => ({
            listing_id: draftId,
            storage_path: img.storagePath,
            public_url: img.publicUrl,
            alt_text: img.altText || null,
            sort_order: img.sortOrder,
            is_cover: img.isCover,
          }))
        );
        if (imagesError) throw imagesError;
      }

      // Availability: only write rows the host actually customized. Never
      // touch dates already tied to a booking.
      const overrideRows = Object.values(data.availabilityOverrides).filter(
        (o) => !bookedDateSet.has(o.date)
      );
      if (overrideRows.length > 0) {
        const { error: availabilityError } = await supabase.from("availability").upsert(
          overrideRows.map((o) => ({
            listing_id: draftId,
            date: o.date,
            status: o.status,
            custom_price_cents: o.customPriceCents,
            minimum_nights: o.minimumNights,
          })),
          { onConflict: "listing_id,date" }
        );
        if (availabilityError) throw availabilityError;
      }

      toast({
        title: mode === "create" ? "Listing submitted for review" : "Listing updated",
        description:
          mode === "create"
            ? "We'll notify you once it's approved and live."
            : "Your changes have been saved.",
      });
      router.push("/host/listings");
      router.refresh();
    } catch (error) {
      console.error("[ListingWizard] submit failed", error);
      toast({
        title: "Couldn't save your listing",
        description:
          error instanceof Error
            ? error.message
            : typeof error === "object" && error && "message" in error
              ? String((error as { message: unknown }).message)
              : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const stepId = WIZARD_STEPS[currentStepIndex].id;
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === WIZARD_STEPS.length - 1;

  return (
    <div>
      <Stepper
        currentStepIndex={currentStepIndex}
        allowJump={mode === "edit"}
        furthestStepIndex={furthestStepIndex}
        onStepClick={goTo}
      />

      <Card>
        <CardContent className="p-6">
          {stepId === "type" && <StepType data={data} update={update} />}
          {stepId === "location" && <StepLocation data={data} update={update} />}
          {stepId === "capacity" && <StepCapacity data={data} update={update} />}
          {stepId === "amenities" && <StepAmenities data={data} update={update} />}
          {stepId === "photos" && <StepPhotos data={data} update={update} draftId={draftId} />}
          {stepId === "details" && <StepDetails data={data} update={update} />}
          {stepId === "pricing" && <StepPricing data={data} update={update} />}
          {stepId === "cancellation" && <StepCancellation data={data} update={update} />}
          {stepId === "calendar" && (
            <StepCalendar data={data} update={update} />
          )}
          {stepId === "review" && (
            <StepReview data={data} mode={mode} submitting={submitting} onSubmit={handleSubmit} />
          )}
        </CardContent>
      </Card>

      {!isLast && (
        <div className="mt-6 flex justify-between">
          <Button type="button" variant="outline" onClick={handleBack} disabled={isFirst}>
            Back
          </Button>
          <Button type="button" onClick={handleNext}>
            Continue
          </Button>
        </div>
      )}
      {isLast && !isFirst && (
        <div className="mt-6">
          <Button type="button" variant="outline" onClick={handleBack}>
            Back
          </Button>
        </div>
      )}
    </div>
  );
}
