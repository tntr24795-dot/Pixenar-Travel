"use client";

import { useMemo } from "react";
import { addDays, format } from "date-fns";

import { formatCents } from "@/lib/utils";
import { calculateBookingQuote } from "@/lib/pricing/calculateBookingQuote";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ListingWizardData } from "@/components/host/listing-wizard/types";

interface StepPricingProps {
  data: ListingWizardData;
  update: (patch: Partial<ListingWizardData>) => void;
}

function centsToInput(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toString();
}

function inputToCents(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

export function StepPricing({ data, update }: StepPricingProps) {
  const sampleQuote = useMemo(() => {
    const checkIn = format(addDays(new Date(), 14), "yyyy-MM-dd");
    const checkOut = format(addDays(new Date(), 17), "yyyy-MM-dd");

    return calculateBookingQuote(
      {
        basePriceCents: data.basePriceCents,
        weekendPriceCents: data.weekendPriceCents,
        cleaningFeeCents: data.cleaningFeeCents,
        extraGuestFeeCents: data.extraGuestFeeCents,
        petFeeCents: data.petFeeCents,
        maximumGuests: data.maximumGuests || 1,
        weeklyDiscountPercent: data.weeklyDiscountPercent,
        monthlyDiscountPercent: data.monthlyDiscountPercent,
        currency: "USD",
        minimumNights: 1,
        maximumNights: 365,
      },
      checkIn,
      checkOut,
      { adults: 2, children: 0, infants: 0, pets: 0 }
    );
  }, [
    data.basePriceCents,
    data.weekendPriceCents,
    data.cleaningFeeCents,
    data.extraGuestFeeCents,
    data.petFeeCents,
    data.maximumGuests,
    data.weeklyDiscountPercent,
    data.monthlyDiscountPercent,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Set your price</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You can change this any time. All amounts are in USD.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="basePriceCents">Base price per night</Label>
          <Input
            id="basePriceCents"
            type="number"
            min={0}
            step="0.01"
            value={centsToInput(data.basePriceCents)}
            onChange={(e) => update({ basePriceCents: inputToCents(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="weekendPriceCents">Weekend price per night (optional)</Label>
          <Input
            id="weekendPriceCents"
            type="number"
            min={0}
            step="0.01"
            value={centsToInput(data.weekendPriceCents)}
            onChange={(e) =>
              update({
                weekendPriceCents: e.target.value === "" ? null : inputToCents(e.target.value),
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cleaningFeeCents">Cleaning fee</Label>
          <Input
            id="cleaningFeeCents"
            type="number"
            min={0}
            step="0.01"
            value={centsToInput(data.cleaningFeeCents)}
            onChange={(e) => update({ cleaningFeeCents: inputToCents(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="extraGuestFeeCents">Extra guest fee (per night)</Label>
          <Input
            id="extraGuestFeeCents"
            type="number"
            min={0}
            step="0.01"
            value={centsToInput(data.extraGuestFeeCents)}
            onChange={(e) => update({ extraGuestFeeCents: inputToCents(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="petFeeCents">Pet fee</Label>
          <Input
            id="petFeeCents"
            type="number"
            min={0}
            step="0.01"
            value={centsToInput(data.petFeeCents)}
            onChange={(e) => update({ petFeeCents: inputToCents(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="securityDepositCents">Security deposit</Label>
          <Input
            id="securityDepositCents"
            type="number"
            min={0}
            step="0.01"
            value={centsToInput(data.securityDepositCents)}
            onChange={(e) => update({ securityDepositCents: inputToCents(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="weeklyDiscountPercent">Weekly discount (%)</Label>
          <Input
            id="weeklyDiscountPercent"
            type="number"
            min={0}
            max={100}
            value={data.weeklyDiscountPercent}
            onChange={(e) => update({ weeklyDiscountPercent: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="monthlyDiscountPercent">Monthly discount (%)</Label>
          <Input
            id="monthlyDiscountPercent"
            type="number"
            min={0}
            max={100}
            value={data.monthlyDiscountPercent}
            onChange={(e) => update({ monthlyDiscountPercent: Number(e.target.value) || 0 })}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sample 3-night quote preview</CardTitle>
        </CardHeader>
        <CardContent>
          {sampleQuote.available ? (
            <ul className="space-y-1.5 text-sm">
              {sampleQuote.items.map((item, i) => (
                <li key={i} className="flex justify-between text-muted-foreground">
                  <span>{item.description}</span>
                  <span>{formatCents(item.totalAmountCents)}</span>
                </li>
              ))}
              <li className="flex justify-between border-t border-border pt-1.5 font-semibold text-foreground">
                <span>Guest total</span>
                <span>{formatCents(sampleQuote.totalCents)}</span>
              </li>
              <li className="flex justify-between text-muted-foreground">
                <span>Your payout (after platform commission)</span>
                <span>{formatCents(sampleQuote.hostPayoutCents)}</span>
              </li>
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Enter a valid price to see a sample quote ({sampleQuote.reason}).
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
