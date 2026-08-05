/**
 * Havena's single, canonical pricing engine.
 *
 * Every price a guest ever sees — the listing page pricing card, the search
 * result "from $X/night", the checkout page, and the amount actually charged
 * via Stripe — MUST come from this one function. Do not reimplement any part
 * of this math on a page or in a component; call this instead. That is the
 * only way the guideline's "ราคาหน้า Listing และ Checkout ต้องตรงกัน" rule
 * (prices must match across every page) can hold.
 *
 * All monetary inputs/outputs are integer cents. Never use floating point
 * for money — every intermediate value here is rounded to the nearest cent
 * before being added into a total.
 */

export interface ListingPricingInput {
  basePriceCents: number;
  weekendPriceCents: number | null;
  cleaningFeeCents: number;
  extraGuestFeeCents: number;
  petFeeCents: number;
  maximumGuests: number;
  weeklyDiscountPercent: number; // e.g. 10 = 10%
  monthlyDiscountPercent: number; // e.g. 20 = 20%
  currency: string;
  minimumNights: number;
  maximumNights: number;
}

export interface GuestCounts {
  adults: number;
  children: number;
  infants: number;
  pets: number;
}

export interface QuoteOptions {
  /** date (YYYY-MM-DD) -> override nightly price in cents, from the availability calendar */
  customPricesByDate?: Record<string, number>;
  /** number of guests included in the base price before extra-guest fees kick in */
  includedGuests?: number;
  /** platform fee charged to the guest, as a percentage of the nightly subtotal. Default 10%. */
  guestServiceFeePercent?: number;
  /** platform commission deducted from the host's payout, as a percentage of host-earned amounts. Default 10%. */
  hostCommissionPercent?: number;
  /** simple flat tax rate applied to the taxable base. Default 0 — must be configured per jurisdiction before going live. */
  taxRatePercent?: number;
}

export interface QuoteLineItem {
  itemType:
    | "accommodation"
    | "cleaning_fee"
    | "extra_guest_fee"
    | "pet_fee"
    | "discount"
    | "guest_service_fee"
    | "tax";
  description: string;
  quantity: number;
  unitAmountCents: number;
  totalAmountCents: number;
}

export interface BookingQuote {
  available: true;
  currency: string;
  nights: number;
  nightlyBreakdown: { date: string; amountCents: number }[];
  items: QuoteLineItem[];
  nightlySubtotalCents: number;
  discountCents: number;
  cleaningFeeCents: number;
  extraGuestFeeCents: number;
  petFeeCents: number;
  guestServiceFeeCents: number;
  taxCents: number;
  /** Total the guest is charged. */
  totalCents: number;
  /** nightlySubtotal + cleaning + extra-guest + pet fees, minus discount — what the host earns before commission. */
  hostGrossCents: number;
  hostCommissionCents: number;
  /** What actually gets transferred to the host's connected Stripe account. */
  hostPayoutCents: number;
}

export type QuoteResult =
  | BookingQuote
  | { available: false; reason: string };

function round(n: number): number {
  return Math.round(n);
}

function isWeekendNight(dateIso: string): boolean {
  const day = new Date(`${dateIso}T00:00:00Z`).getUTCDay();
  return day === 5 || day === 6; // Friday or Saturday night
}

function addDays(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function calculateBookingQuote(
  listing: ListingPricingInput,
  checkIn: string,
  checkOut: string,
  guests: GuestCounts,
  options: QuoteOptions = {}
): QuoteResult {
  const {
    customPricesByDate = {},
    includedGuests = 2,
    guestServiceFeePercent = 10,
    hostCommissionPercent = 10,
    taxRatePercent = 0,
  } = options;

  const checkInDate = new Date(`${checkIn}T00:00:00Z`);
  const checkOutDate = new Date(`${checkOut}T00:00:00Z`);
  const nights = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 86_400_000);

  if (!Number.isFinite(nights) || nights <= 0) {
    return { available: false, reason: "invalid_date_range" };
  }
  if (nights < listing.minimumNights) {
    return { available: false, reason: `minimum_stay_${listing.minimumNights}_nights` };
  }
  if (nights > listing.maximumNights) {
    return { available: false, reason: `maximum_stay_${listing.maximumNights}_nights` };
  }

  const totalGuests = guests.adults + guests.children;
  if (totalGuests > listing.maximumGuests) {
    return { available: false, reason: "exceeds_maximum_guests" };
  }

  // ---- Nightly breakdown -------------------------------------------------
  const nightlyBreakdown: { date: string; amountCents: number }[] = [];
  let nightlySubtotalCents = 0;

  for (let i = 0; i < nights; i++) {
    const date = addDays(checkIn, i);
    let amount = customPricesByDate[date];
    if (amount === undefined) {
      amount = isWeekendNight(date) && listing.weekendPriceCents != null
        ? listing.weekendPriceCents
        : listing.basePriceCents;
    }
    nightlyBreakdown.push({ date, amountCents: amount });
    nightlySubtotalCents += amount;
  }

  // ---- Length-of-stay discount --------------------------------------------
  let discountPercent = 0;
  if (nights >= 28 && listing.monthlyDiscountPercent > 0) {
    discountPercent = listing.monthlyDiscountPercent;
  } else if (nights >= 7 && listing.weeklyDiscountPercent > 0) {
    discountPercent = listing.weeklyDiscountPercent;
  }
  const discountCents = round(nightlySubtotalCents * (discountPercent / 100));

  // ---- Fees ----------------------------------------------------------------
  const extraGuests = Math.max(0, totalGuests - includedGuests);
  const extraGuestFeeCents = extraGuests > 0 ? extraGuests * listing.extraGuestFeeCents * nights : 0;
  const petFeeCents = guests.pets > 0 ? guests.pets * listing.petFeeCents : 0;
  const cleaningFeeCents = listing.cleaningFeeCents;

  const guestServiceFeeCents = round((nightlySubtotalCents - discountCents) * (guestServiceFeePercent / 100));

  const taxableBase =
    nightlySubtotalCents - discountCents + cleaningFeeCents + extraGuestFeeCents + petFeeCents;
  const taxCents = round(taxableBase * (taxRatePercent / 100));

  const totalCents =
    nightlySubtotalCents -
    discountCents +
    cleaningFeeCents +
    extraGuestFeeCents +
    petFeeCents +
    guestServiceFeeCents +
    taxCents;

  // ---- Host payout -----------------------------------------------------
  const hostGrossCents =
    nightlySubtotalCents - discountCents + cleaningFeeCents + extraGuestFeeCents + petFeeCents;
  const hostCommissionCents = round(hostGrossCents * (hostCommissionPercent / 100));
  const hostPayoutCents = hostGrossCents - hostCommissionCents;

  const items: QuoteLineItem[] = [
    {
      itemType: "accommodation",
      description: `${formatMoneyDescription(nightlyBreakdown)} × ${nights} night${nights > 1 ? "s" : ""}`,
      quantity: nights,
      unitAmountCents: Math.round(nightlySubtotalCents / nights),
      totalAmountCents: nightlySubtotalCents,
    },
  ];

  if (discountCents > 0) {
    items.push({
      itemType: "discount",
      description: nights >= 28 ? "Monthly discount" : "Weekly discount",
      quantity: 1,
      unitAmountCents: -discountCents,
      totalAmountCents: -discountCents,
    });
  }
  if (cleaningFeeCents > 0) {
    items.push({
      itemType: "cleaning_fee",
      description: "Cleaning fee",
      quantity: 1,
      unitAmountCents: cleaningFeeCents,
      totalAmountCents: cleaningFeeCents,
    });
  }
  if (extraGuestFeeCents > 0) {
    items.push({
      itemType: "extra_guest_fee",
      description: `Extra guest fee (${extraGuests} guest${extraGuests > 1 ? "s" : ""} × ${nights} night${nights > 1 ? "s" : ""})`,
      quantity: extraGuests * nights,
      unitAmountCents: listing.extraGuestFeeCents,
      totalAmountCents: extraGuestFeeCents,
    });
  }
  if (petFeeCents > 0) {
    items.push({
      itemType: "pet_fee",
      description: `Pet fee (${guests.pets})`,
      quantity: guests.pets,
      unitAmountCents: listing.petFeeCents,
      totalAmountCents: petFeeCents,
    });
  }
  items.push({
    itemType: "guest_service_fee",
    description: "Guest service fee",
    quantity: 1,
    unitAmountCents: guestServiceFeeCents,
    totalAmountCents: guestServiceFeeCents,
  });
  if (taxCents > 0) {
    items.push({
      itemType: "tax",
      description: "Taxes",
      quantity: 1,
      unitAmountCents: taxCents,
      totalAmountCents: taxCents,
    });
  }

  return {
    available: true,
    currency: listing.currency,
    nights,
    nightlyBreakdown,
    items,
    nightlySubtotalCents,
    discountCents,
    cleaningFeeCents,
    extraGuestFeeCents,
    petFeeCents,
    guestServiceFeeCents,
    taxCents,
    totalCents,
    hostGrossCents,
    hostCommissionCents,
    hostPayoutCents,
  };
}

function formatMoneyDescription(nightlyBreakdown: { amountCents: number }[]): string {
  const first = nightlyBreakdown[0]?.amountCents ?? 0;
  const allSame = nightlyBreakdown.every((n) => n.amountCents === first);
  const amount = (allSame ? first : Math.round(
    nightlyBreakdown.reduce((s, n) => s + n.amountCents, 0) / nightlyBreakdown.length
  )) / 100;
  return `$${amount.toFixed(2)}${allSame ? "" : " avg"}`;
}
