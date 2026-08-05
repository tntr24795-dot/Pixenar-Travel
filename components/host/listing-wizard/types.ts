import type { CANCELLATION_POLICIES, PROPERTY_TYPES, ROOM_TYPES } from "@/constants";

export type PropertyType = (typeof PROPERTY_TYPES)[number]["value"];
export type RoomType = (typeof ROOM_TYPES)[number]["value"];
export type CancellationPolicy = (typeof CANCELLATION_POLICIES)[number]["value"];

export interface WizardImage {
  /** Client-side id, stable across re-renders/reordering (not a DB id). */
  clientId: string;
  storagePath: string;
  publicUrl: string;
  altText: string;
  sortOrder: number;
  isCover: boolean;
}

export interface WizardAvailabilityOverride {
  date: string; // YYYY-MM-DD
  status: "available" | "blocked";
  customPriceCents: number | null;
  minimumNights: number | null;
}

/**
 * All 10 wizard steps' data held in one shape. Steps 1–8 map ~1:1 onto the
 * `listingStep*Schema` Zod schemas in `lib/validation/schemas.ts` (camelCase
 * matches those schemas exactly so we can validate a step by just picking
 * its slice of this object and calling `.parse`).
 */
export interface ListingWizardData {
  // Step 1 — property type
  propertyType: PropertyType;
  roomType: RoomType;

  // Step 2 — address
  country: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;

  // Step 3 — capacity
  maximumGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;

  // Step 4 — amenities
  amenityIds: string[];

  // Step 5 — photos
  images: WizardImage[];

  // Step 6 — details
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  houseRules: string;
  checkInTime: string;
  checkOutTime: string;
  minimumNights: number;
  maximumNights: number;

  // Step 7 — pricing
  basePriceCents: number;
  weekendPriceCents: number | null;
  cleaningFeeCents: number;
  extraGuestFeeCents: number;
  petFeeCents: number;
  securityDepositCents: number;
  weeklyDiscountPercent: number;
  monthlyDiscountPercent: number;

  // Step 8 — cancellation policy
  cancellationPolicy: CancellationPolicy;

  // Step 9 — calendar: only dates that differ from the "available, default
  // price" baseline are kept here, keyed by date so edits are idempotent.
  availabilityOverrides: Record<string, WizardAvailabilityOverride>;
}

export function createDefaultWizardData(): ListingWizardData {
  return {
    propertyType: "house",
    roomType: "entire_place",

    country: "United States",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    latitude: null,
    longitude: null,

    maximumGuests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,

    amenityIds: [],

    images: [],

    title: "",
    slug: "",
    shortDescription: "",
    description: "",
    houseRules: "",
    checkInTime: "15:00",
    checkOutTime: "11:00",
    minimumNights: 1,
    maximumNights: 365,

    basePriceCents: 10000,
    weekendPriceCents: null,
    cleaningFeeCents: 0,
    extraGuestFeeCents: 0,
    petFeeCents: 0,
    securityDepositCents: 0,
    weeklyDiscountPercent: 0,
    monthlyDiscountPercent: 0,

    cancellationPolicy: "moderate",

    availabilityOverrides: {},
  };
}

export const WIZARD_STEPS = [
  { id: "type", label: "Property type" },
  { id: "location", label: "Address" },
  { id: "capacity", label: "Capacity" },
  { id: "amenities", label: "Amenities" },
  { id: "photos", label: "Photos" },
  { id: "details", label: "Details" },
  { id: "pricing", label: "Pricing" },
  { id: "cancellation", label: "Cancellation" },
  { id: "calendar", label: "Calendar" },
  { id: "review", label: "Review & publish" },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];
