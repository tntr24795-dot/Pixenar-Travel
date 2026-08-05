import { ShieldCheck, CreditCard } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

// Kept purely informational for this MVP: there's no Stripe Customer object
// created/stored anywhere else in this codebase (bookings only carry a
// PaymentIntent id — see `bookings.stripe_payment_intent_id` in
// types/database.ts — not a Customer id), so there's nothing reliable to feed
// `stripe.customers.listPaymentMethods` yet. Half-wiring a customer model
// that doesn't exist elsewhere would create a false impression of working
// functionality, so this page just explains how payment works instead.
export default function PaymentMethodsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Payment methods</h1>
        <p className="text-muted-foreground">How you pay for your stays.</p>
      </div>

      <Card>
        <CardContent className="space-y-4 py-8">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <p className="text-sm">
              Havena doesn&apos;t store your card details or keep a saved payment method on
              file. Every time you book, you&apos;ll enter your card securely at checkout
              through Stripe.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <p className="text-sm">
              Payments are processed by Stripe, a PCI-compliant payment processor. Havena
              never sees or stores your full card number.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
