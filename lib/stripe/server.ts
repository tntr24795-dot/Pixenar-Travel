import "server-only";
import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Server-only Stripe client, configured for Stripe Connect (Marketplace).
 * Never import this file from a Client Component.
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add your Stripe TEST secret key to .env.local before using any payment routes."
    );
  }

  _stripe = new Stripe(key, {
    apiVersion: "2024-06-20",
    typescript: true,
  });
  return _stripe;
}

/**
 * Creates (or reuses) a Stripe Connect Express account for a host and
 * returns an onboarding Account Link. Uses "destination charges" — the
 * platform charges the guest's card directly and automatically routes the
 * host's share to their connected account via `transfer_data`, with the
 * remainder (platform fee) retained on the platform's own balance.
 */
export async function createConnectOnboardingLink(params: {
  existingAccountId?: string | null;
  email: string;
  returnUrl: string;
  refreshUrl: string;
}): Promise<{ accountId: string; url: string }> {
  const stripe = getStripe();

  const account =
    params.existingAccountId
      ? await stripe.accounts.retrieve(params.existingAccountId)
      : await stripe.accounts.create({
          type: "express",
          email: params.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: "account_onboarding",
  });

  return { accountId: account.id, url: accountLink.url };
}

/**
 * Creates a PaymentIntent for a booking using the "destination charge" model:
 * the full guest total is charged to the platform's Stripe account, and
 * `transfer_data.amount` moves the host's net payout to their connected
 * account automatically once the charge succeeds. The difference (guest
 * service fee + host commission) stays on the platform balance.
 *
 * IMPORTANT: `totalCents` and `hostPayoutCents` must come from
 * `calculateBookingQuote()` recomputed from the database — never from a
 * value supplied by the browser.
 */
export async function createBookingPaymentIntent(params: {
  totalCents: number;
  currency: string;
  hostStripeAccountId: string;
  hostPayoutCents: number;
  bookingId: string;
  bookingNumber: string;
}) {
  const stripe = getStripe();

  return stripe.paymentIntents.create({
    amount: params.totalCents,
    currency: params.currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    transfer_data: {
      destination: params.hostStripeAccountId,
      amount: params.hostPayoutCents,
    },
    metadata: {
      booking_id: params.bookingId,
      booking_number: params.bookingNumber,
    },
  });
}

export function verifyWebhookSignature(rawBody: string, signature: string): Stripe.Event {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
  }
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}
