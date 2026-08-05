import { z } from "zod";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const signUpSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(60),
  lastName: z.string().min(1, "Last name is required").max(60),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
export const searchQuerySchema = z.object({
  location: z.string().optional(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adults: z.coerce.number().int().min(1).default(1),
  children: z.coerce.number().int().min(0).default(0),
  infants: z.coerce.number().int().min(0).default(0),
  pets: z.coerce.number().int().min(0).default(0),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  propertyType: z.string().optional(),
  roomType: z.string().optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  beds: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().min(0).optional(),
  instantBook: z.coerce.boolean().optional(),
  amenities: z.array(z.string()).optional(),
  sort: z
    .enum(["recommended", "price_asc", "price_desc", "rating", "newest", "distance"])
    .default("recommended"),
});
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;

// ---------------------------------------------------------------------------
// Pricing quote request
// ---------------------------------------------------------------------------
export const quoteRequestSchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1),
  children: z.number().int().min(0).default(0),
  infants: z.number().int().min(0).default(0),
  pets: z.number().int().min(0).default(0),
});
export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;

// ---------------------------------------------------------------------------
// Booking hold / checkout
// ---------------------------------------------------------------------------
export const createHoldSchema = z.object({
  listingId: z.string().uuid(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1),
  children: z.number().int().min(0).default(0),
  infants: z.number().int().min(0).default(0),
  pets: z.number().int().min(0).default(0),
});
export type CreateHoldInput = z.infer<typeof createHoldSchema>;

// ---------------------------------------------------------------------------
// Listing wizard (host)
// ---------------------------------------------------------------------------
export const listingStepTypeSchema = z.object({
  propertyType: z.enum([
    "house",
    "apartment",
    "condo",
    "cabin",
    "villa",
    "tiny_home",
    "guesthouse",
    "hotel_room",
    "private_room",
  ]),
  roomType: z.enum(["entire_place", "private_room", "shared_room"]),
});

export const listingStepLocationSchema = z.object({
  country: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
});

export const listingStepCapacitySchema = z.object({
  maximumGuests: z.number().int().min(1).max(50),
  bedrooms: z.number().int().min(0).max(50),
  beds: z.number().int().min(0).max(50),
  bathrooms: z.number().min(0).max(50),
});

export const listingStepAmenitiesSchema = z.object({
  amenityIds: z.array(z.string().uuid()),
});

export const listingStepImagesSchema = z.object({
  images: z
    .array(
      z.object({
        storagePath: z.string(),
        publicUrl: z.string().url(),
        altText: z.string().optional(),
        sortOrder: z.number().int(),
        isCover: z.boolean(),
      })
    )
    .min(5, "Upload at least 5 photos"),
});

export const listingStepDetailsSchema = z.object({
  title: z.string().min(1).max(100),
  shortDescription: z.string().max(300).optional(),
  description: z.string().min(1),
  houseRules: z.string().optional(),
  checkInTime: z.string(),
  checkOutTime: z.string(),
  minimumNights: z.number().int().min(1),
  maximumNights: z.number().int().min(1),
});

export const listingStepPricingSchema = z.object({
  basePriceCents: z.number().int().min(0),
  weekendPriceCents: z.number().int().min(0).nullable().optional(),
  cleaningFeeCents: z.number().int().min(0),
  extraGuestFeeCents: z.number().int().min(0),
  petFeeCents: z.number().int().min(0),
  securityDepositCents: z.number().int().min(0),
  weeklyDiscountPercent: z.number().min(0).max(100),
  monthlyDiscountPercent: z.number().min(0).max(100),
});

export const listingStepCancellationSchema = z.object({
  cancellationPolicy: z.enum(["flexible", "moderate", "strict"]),
});

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export const createReviewSchema = z.object({
  bookingId: z.string().uuid(),
  ratingOverall: z.number().int().min(1).max(5),
  ratingCleanliness: z.number().int().min(1).max(5).optional(),
  ratingAccuracy: z.number().int().min(1).max(5).optional(),
  ratingCheckIn: z.number().int().min(1).max(5).optional(),
  ratingCommunication: z.number().int().min(1).max(5).optional(),
  ratingLocation: z.number().int().min(1).max(5).optional(),
  ratingValue: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------
export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().min(1).max(4000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
