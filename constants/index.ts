export const APP_NAME = "Havena";

export const PROPERTY_TYPES = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "condo", label: "Condo" },
  { value: "cabin", label: "Cabin" },
  { value: "villa", label: "Villa" },
  { value: "tiny_home", label: "Tiny home" },
  { value: "guesthouse", label: "Guesthouse" },
  { value: "hotel_room", label: "Hotel room" },
  { value: "private_room", label: "Private room" },
] as const;

export const ROOM_TYPES = [
  { value: "entire_place", label: "Entire place" },
  { value: "private_room", label: "Private room" },
  { value: "shared_room", label: "Shared room" },
] as const;

export const CANCELLATION_POLICIES = [
  {
    value: "flexible",
    label: "Flexible",
    description: "Full refund if the guest cancels at least 24 hours before check-in.",
  },
  {
    value: "moderate",
    label: "Moderate",
    description: "Full refund if the guest cancels at least 5 days before check-in.",
  },
  {
    value: "strict",
    label: "Strict",
    description: "50% refund if the guest cancels at least 14 days before check-in; no refund after that.",
  },
] as const;

export const AMENITY_ICON_MAP: Record<string, string> = {
  "Wi-Fi": "wifi",
  Kitchen: "chef-hat",
  Washer: "shirt",
  Dryer: "wind",
  "Free parking": "car",
  "Air conditioning": "snowflake",
  Heating: "flame",
  Pool: "waves",
  "Hot tub": "droplets",
  Workspace: "laptop",
  TV: "tv",
  "Pet friendly": "paw-print",
};

export const LISTING_STATUSES = [
  "draft",
  "pending_review",
  "active",
  "paused",
  "rejected",
  "suspended",
  "archived",
] as const;

export const BOOKING_STATUSES = [
  "pending_payment",
  "confirmed",
  "cancelled",
  "expired",
  "completed",
  "refunded",
  "partially_refunded",
  "disputed",
] as const;

/** How long a booking hold reserves the dates before it expires, in minutes. */
export const BOOKING_HOLD_MINUTES = 15;

/** MVP launch market, per the guideline's scope constraints. */
export const LAUNCH_STATE = "Texas";
export const LAUNCH_CURRENCY = "USD";

export const NAV_LINKS = [
  { href: "/search", label: "Explore" },
  { href: "/become-a-host", label: "Become a host" },
  { href: "/help", label: "Help" },
] as const;
