import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ListingWizard } from "@/components/host/listing-wizard/wizard";
import type {
  CancellationPolicy,
  ListingWizardData,
  PropertyType,
  RoomType,
  WizardAvailabilityOverride,
  WizardImage,
} from "@/components/host/listing-wizard/types";

export const metadata = {
  title: "Edit listing — Havena Host",
};

export default async function EditListingPage({
  params,
}: {
  params: { listingId: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/host/listings/${params.listingId}/edit`);
  }

  const [{ data: listing }, { data: images }, { data: listingAmenities }, { data: availabilityRows }] =
    await Promise.all([
      supabase.from("listings").select("*").eq("id", params.listingId).maybeSingle(),
      supabase
        .from("listing_images")
        .select("*")
        .eq("listing_id", params.listingId)
        .order("sort_order"),
      supabase.from("listing_amenities").select("amenity_id").eq("listing_id", params.listingId),
      supabase.from("availability").select("*").eq("listing_id", params.listingId),
    ]);

  if (!listing) {
    notFound();
  }

  // RLS already prevents reading another host's draft listing, but double
  // check explicitly since this page renders write-capable UI.
  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!hostProfile || hostProfile.id !== listing.host_id) {
    redirect("/host/listings");
  }

  const bookedDates: string[] = [];
  const availabilityOverrides: Record<string, WizardAvailabilityOverride> = {};
  for (const row of availabilityRows ?? []) {
    if (row.status === "booked") {
      bookedDates.push(row.date);
      continue;
    }
    if (row.status === "blocked" || row.custom_price_cents != null || row.minimum_nights != null) {
      availabilityOverrides[row.date] = {
        date: row.date,
        status: row.status === "blocked" ? "blocked" : "available",
        customPriceCents: row.custom_price_cents,
        minimumNights: row.minimum_nights,
      };
    }
  }

  const wizardImages: WizardImage[] = (images ?? []).map((img) => ({
    clientId: img.id,
    storagePath: img.storage_path,
    publicUrl: img.public_url,
    altText: img.alt_text ?? "",
    sortOrder: img.sort_order,
    isCover: img.is_cover,
  }));

  const initialData: ListingWizardData = {
    propertyType: listing.property_type as PropertyType,
    roomType: listing.room_type as RoomType,

    country: listing.country ?? "",
    addressLine1: listing.address_line_1 ?? "",
    addressLine2: listing.address_line_2 ?? "",
    city: listing.city ?? "",
    state: listing.state ?? "",
    postalCode: listing.postal_code ?? "",
    latitude: listing.latitude,
    longitude: listing.longitude,

    maximumGuests: listing.maximum_guests,
    bedrooms: listing.bedrooms,
    beds: listing.beds,
    bathrooms: listing.bathrooms,

    amenityIds: (listingAmenities ?? []).map((row) => row.amenity_id),

    images: wizardImages,

    title: listing.title,
    slug: listing.slug,
    // The DB only stores one `description` column (short description / house
    // rules were folded into it on create) — pre-fill the full text here and
    // let the host re-split it if they want dedicated sections again.
    shortDescription: "",
    description: listing.description ?? "",
    houseRules: "",
    checkInTime: listing.check_in_time,
    checkOutTime: listing.check_out_time,
    minimumNights: listing.minimum_nights,
    maximumNights: listing.maximum_nights,

    basePriceCents: listing.base_price_cents,
    weekendPriceCents: listing.weekend_price_cents,
    cleaningFeeCents: listing.cleaning_fee_cents,
    extraGuestFeeCents: listing.extra_guest_fee_cents,
    petFeeCents: listing.pet_fee_cents,
    securityDepositCents: listing.security_deposit_cents,
    weeklyDiscountPercent: Number(listing.weekly_discount_percent),
    monthlyDiscountPercent: Number(listing.monthly_discount_percent),

    cancellationPolicy: listing.cancellation_policy as CancellationPolicy,

    availabilityOverrides,
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Edit {listing.title}</h1>
        <p className="mt-1 text-muted-foreground">
          Jump to any step below — changes are saved when you press "Save changes" on the
          review step.
        </p>
      </div>
      <ListingWizard
        mode="edit"
        hostProfileId={listing.host_id}
        listingId={listing.id}
        initialData={initialData}
        bookedDates={bookedDates}
      />
    </div>
  );
}
