import type { Metadata } from "next";

import { APP_NAME } from "@/constants";

export const metadata: Metadata = {
  title: `Host Terms — ${APP_NAME}`,
  description: `Additional terms that apply to hosts listing a property on ${APP_NAME}.`,
};

export default function HostTermsPage() {
  return (
    <div className="container max-w-3xl py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
        Host Terms
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: August 5, 2026
      </p>

      <div className="prose prose-neutral mt-8 max-w-none text-foreground/90">
        <p>
          These Host Terms are additional terms that apply whenever you list
          a property on {APP_NAME} (a &quot;Host&quot;), on top of our
          general <a href="/terms">Terms of Service</a>.
        </p>

        <h2>1. Listing accuracy</h2>
        <p>
          You agree that your Listing accurately represents the property,
          including its location, photos, amenities, maximum occupancy, and
          house rules. Misrepresenting a Listing may result in removal from
          the Platform.
        </p>

        <h2>2. Pricing and fees</h2>
        <p>
          You set your own nightly rate, cleaning fee, extra-guest fee, pet
          fee, and security deposit. {APP_NAME} charges a service fee on each
          completed booking, deducted automatically before payout. All
          amounts are calculated by {APP_NAME}&apos;s pricing engine at the
          time of booking — Hosts cannot override the calculated total shown
          to a Guest at checkout.
        </p>

        <h2>3. Identity verification and payouts</h2>
        <p>
          Before you can accept bookings, you must complete identity
          verification and connect a payout account through our payment
          processor&apos;s onboarding flow. Payouts are released according to
          the payout schedule shown in your Host dashboard, net of the{" "}
          {APP_NAME} service fee.
        </p>

        <h2>4. Cancellation policy</h2>
        <p>
          You must select one of {APP_NAME}&apos;s standard cancellation
          policies (Flexible, Moderate, or Strict) for each Listing. You may
          not offer refund terms outside of these standard policies. See our{" "}
          <a href="/cancellation-policy">Cancellation Policy</a> page.
        </p>

        <h2>5. Availability and double-bookings</h2>
        <p>
          You are responsible for keeping your calendar accurate. If you
          manage availability on other platforms as well, you must sync your
          calendar promptly to avoid double-bookings. {APP_NAME} cannot
          restore a Guest&apos;s reserved dates once conflicting dates have
          been confirmed elsewhere.
        </p>

        <h2>6. Guest safety and habitability</h2>
        <p>
          You agree to maintain your property in a clean, safe, and habitable
          condition, with working smoke and carbon monoxide detectors where
          required by local law, and to disclose any known hazards.
        </p>

        <h2>7. Reviews</h2>
        <p>
          Hosts may respond publicly to Guest reviews but may not offer
          incentives in exchange for a review or its removal.
        </p>

        <h2>8. Suspension</h2>
        <p>
          {APP_NAME} may pause, suspend, or remove a Listing that receives
          repeated valid complaints, fails to maintain accurate availability,
          or otherwise violates these Host Terms or our Terms of Service.
        </p>

        <p className="rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground">
          This page is a template for the {APP_NAME} MVP and has not been
          reviewed by an attorney. It must be reviewed by qualified legal
          counsel before this platform accepts real hosts or bookings.
        </p>
      </div>
    </div>
  );
}
