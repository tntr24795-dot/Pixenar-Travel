import { describe, expect, it } from "vitest";
import { calculateBookingQuote, type ListingPricingInput } from "./calculateBookingQuote";

const baseListing: ListingPricingInput = {
  basePriceCents: 10000, // $100/night
  weekendPriceCents: null,
  cleaningFeeCents: 5000, // $50
  extraGuestFeeCents: 1500, // $15/extra guest/night
  petFeeCents: 2000, // $20/pet
  maximumGuests: 6,
  weeklyDiscountPercent: 10,
  monthlyDiscountPercent: 20,
  currency: "USD",
  minimumNights: 1,
  maximumNights: 365,
};

const guests = { adults: 2, children: 0, infants: 0, pets: 0 };

describe("calculateBookingQuote", () => {
  it("matches the guideline's worked example: $100 x 3 nights + $50 cleaning + 10% guest service fee = $380", () => {
    const quote = calculateBookingQuote(baseListing, "2026-10-10", "2026-10-13", guests);
    if (!quote.available) throw new Error("expected quote to be available");

    expect(quote.nights).toBe(3);
    expect(quote.nightlySubtotalCents).toBe(30000); // $300
    expect(quote.cleaningFeeCents).toBe(5000); // $50
    expect(quote.guestServiceFeeCents).toBe(3000); // 10% of $300 = $30
    expect(quote.taxCents).toBe(0); // no tax configured by default
    expect(quote.totalCents).toBe(38000); // $380
  });

  it("deducts a 10% platform commission from the host's gross earnings", () => {
    const quote = calculateBookingQuote(baseListing, "2026-10-10", "2026-10-13", guests, {
      hostCommissionPercent: 10,
    });
    if (!quote.available) throw new Error("expected quote to be available");

    // host gross = nightly subtotal + cleaning fee = $300 + $50 = $350
    expect(quote.hostGrossCents).toBe(35000);
    expect(quote.hostCommissionCents).toBe(3500); // 10% of $350
    expect(quote.hostPayoutCents).toBe(31500); // $315
  });

  it("never stores a bare total — every fee is broken out into its own line item", () => {
    const quote = calculateBookingQuote(baseListing, "2026-10-10", "2026-10-13", guests);
    if (!quote.available) throw new Error("expected quote to be available");

    const types = quote.items.map((i) => i.itemType);
    expect(types).toContain("accommodation");
    expect(types).toContain("cleaning_fee");
    expect(types).toContain("guest_service_fee");
    // sum of all line items must equal the total charged to the guest
    const sum = quote.items.reduce((s, i) => s + i.totalAmountCents, 0);
    expect(sum).toBe(quote.totalCents);
  });

  it("applies a weekly discount at 7+ nights", () => {
    const quote = calculateBookingQuote(baseListing, "2026-10-01", "2026-10-08", guests);
    if (!quote.available) throw new Error("expected quote to be available");
    expect(quote.nights).toBe(7);
    expect(quote.discountCents).toBe(7000); // 10% of $700
  });

  it("applies a monthly discount instead of weekly at 28+ nights", () => {
    const quote = calculateBookingQuote(baseListing, "2026-10-01", "2026-10-29", guests);
    if (!quote.available) throw new Error("expected quote to be available");
    expect(quote.nights).toBe(28);
    expect(quote.discountCents).toBe(56000); // 20% of $2800
  });

  it("charges an extra-guest fee per additional guest per night beyond the included count", () => {
    const quote = calculateBookingQuote(
      baseListing,
      "2026-10-10",
      "2026-10-13",
      { adults: 4, children: 0, infants: 0, pets: 0 },
      { includedGuests: 2 }
    );
    if (!quote.available) throw new Error("expected quote to be available");
    // 2 extra guests x $15 x 3 nights = $90
    expect(quote.extraGuestFeeCents).toBe(9000);
  });

  it("charges a flat pet fee per pet, not per night", () => {
    const quote = calculateBookingQuote(baseListing, "2026-10-10", "2026-10-13", {
      adults: 2,
      children: 0,
      infants: 0,
      pets: 2,
    });
    if (!quote.available) throw new Error("expected quote to be available");
    expect(quote.petFeeCents).toBe(4000); // 2 pets x $20
  });

  it("rejects a stay shorter than the listing's minimum nights", () => {
    const quote = calculateBookingQuote(
      { ...baseListing, minimumNights: 5 },
      "2026-10-10",
      "2026-10-12",
      guests
    );
    expect(quote.available).toBe(false);
  });

  it("rejects a guest count above the listing's maximum", () => {
    const quote = calculateBookingQuote(baseListing, "2026-10-10", "2026-10-13", {
      adults: 8,
      children: 0,
      infants: 0,
      pets: 0,
    });
    expect(quote.available).toBe(false);
  });

  it("rejects an inverted or empty date range", () => {
    const quote = calculateBookingQuote(baseListing, "2026-10-13", "2026-10-13", guests);
    expect(quote.available).toBe(false);
  });

  it("applies a custom per-date override price from the availability calendar", () => {
    const quote = calculateBookingQuote(baseListing, "2026-10-10", "2026-10-12", guests, {
      customPricesByDate: { "2026-10-10": 20000 },
    });
    if (!quote.available) throw new Error("expected quote to be available");
    expect(quote.nightlyBreakdown[0].amountCents).toBe(20000);
    expect(quote.nightlyBreakdown[1].amountCents).toBe(10000);
    expect(quote.nightlySubtotalCents).toBe(30000);
  });

  it("applies the weekend price on Friday and Saturday nights when set", () => {
    // 2026-10-16 is a Friday
    const quote = calculateBookingQuote(
      { ...baseListing, weekendPriceCents: 15000 },
      "2026-10-16",
      "2026-10-18",
      guests
    );
    if (!quote.available) throw new Error("expected quote to be available");
    expect(quote.nightlyBreakdown[0].amountCents).toBe(15000); // Fri
    expect(quote.nightlyBreakdown[1].amountCents).toBe(15000); // Sat
  });

  it("is deterministic given the same inputs (safe to call from listing page, checkout and PaymentIntent creation alike)", () => {
    const a = calculateBookingQuote(baseListing, "2026-10-10", "2026-10-13", guests);
    const b = calculateBookingQuote(baseListing, "2026-10-10", "2026-10-13", guests);
    expect(a).toEqual(b);
  });
});
