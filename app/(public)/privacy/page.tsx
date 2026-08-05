import type { Metadata } from "next";

import { APP_NAME } from "@/constants";

export const metadata: Metadata = {
  title: `Privacy Policy — ${APP_NAME}`,
  description: `How ${APP_NAME} collects, uses, and protects your personal information.`,
};

export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: August 5, 2026
      </p>

      <div className="prose prose-neutral mt-8 max-w-none text-foreground/90">
        <p>
          This Privacy Policy explains what information {APP_NAME} collects,
          how we use it, and the choices you have.
        </p>

        <h2>1. Information we collect</h2>
        <ul>
          <li>
            <strong>Account information:</strong> name, email address, phone
            number, and profile photo.
          </li>
          <li>
            <strong>Booking information:</strong> stay dates, guest counts,
            payment details (processed by our PCI-compliant payment
            provider — we never store full card numbers), and communications
            with Hosts or Guests.
          </li>
          <li>
            <strong>Host information:</strong> identity verification details
            and payout account information, used to enable payouts.
          </li>
          <li>
            <strong>Usage information:</strong> pages visited, searches
            performed, and device/browser information, collected to improve
            the Platform.
          </li>
        </ul>

        <h2>2. How we use your information</h2>
        <ul>
          <li>To create and secure your account</li>
          <li>To process bookings, payments, and payouts</li>
          <li>To facilitate communication between Guests and Hosts</li>
          <li>To send booking confirmations, receipts, and support updates</li>
          <li>To detect and prevent fraud</li>
          <li>To improve and personalize the Platform</li>
        </ul>

        <h2>3. Sharing your information</h2>
        <p>
          We share limited booking details (e.g., first name, arrival
          details) between a Guest and Host once a booking is confirmed so
          the stay can happen. Full property addresses are only shared with
          a Guest after their booking is confirmed. We share information with
          service providers (payment processing, identity verification,
          email delivery, mapping) strictly to operate the Platform.
        </p>

        <h2>4. Your choices</h2>
        <p>
          You can review and update most of your account information from
          your account settings at any time. You may request deletion of
          your account by contacting support, subject to records we are
          required to retain for legal, tax, or dispute-resolution purposes.
        </p>

        <h2>5. Data security</h2>
        <p>
          We use industry-standard safeguards — encryption in transit,
          row-level access controls, and least-privilege service accounts —
          to protect your data. No system is perfectly secure, and we
          encourage you to use a strong, unique password.
        </p>

        <h2>6. Contact</h2>
        <p>
          Questions about this policy? Reach us via our{" "}
          <a href="/contact">contact page</a>.
        </p>

        <p className="rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground">
          This page is a template for the {APP_NAME} MVP and has not been
          reviewed by an attorney. It must be reviewed by qualified legal
          counsel — including for applicable state and international privacy
          law (e.g. CCPA, GDPR) — before this platform accepts real user
          data.
        </p>
      </div>
    </div>
  );
}
