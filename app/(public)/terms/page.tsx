import type { Metadata } from "next";

import { APP_NAME } from "@/constants";

export const metadata: Metadata = {
  title: `Terms of Service — ${APP_NAME}`,
  description: `The terms that govern your use of ${APP_NAME}.`,
};

export default function TermsPage() {
  return (
    <div className="container max-w-3xl py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: August 5, 2026
      </p>

      <div className="prose prose-neutral mt-8 max-w-none text-foreground/90">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and
          use of {APP_NAME} (the &quot;Platform&quot;), operated by{" "}
          {APP_NAME}, Inc. (&quot;{APP_NAME}&quot;, &quot;we&quot;,
          &quot;us&quot;). By creating an account, browsing listings, or
          booking a stay, you agree to these Terms.
        </p>

        <h2>1. The role we play</h2>
        <p>
          {APP_NAME} is a marketplace that connects independent hosts
          (&quot;Hosts&quot;) offering vacation rental accommodations
          (&quot;Listings&quot;) with travelers (&quot;Guests&quot;) looking to
          book them. We are not a party to the rental agreement between a
          Host and a Guest — that contract is between the Host and the Guest
          directly. {APP_NAME} provides the technology, payment processing,
          and support that makes the booking possible.
        </p>

        <h2>2. Accounts</h2>
        <p>
          You must be at least 18 years old to create an account. You are
          responsible for maintaining the confidentiality of your login
          credentials and for all activity that occurs under your account.
        </p>

        <h2>3. Bookings and payment</h2>
        <p>
          All prices are shown in U.S. dollars and calculated server-side at
          the time of booking, including any applicable cleaning fees, guest
          fees, service fees, and taxes. Payment is processed through our
          payment provider at the time your booking is confirmed. A booking
          is only confirmed once payment succeeds and the dates are
          successfully reserved — holding a date while you check out does not
          guarantee availability until payment completes.
        </p>

        <h2>4. Cancellations and refunds</h2>
        <p>
          Each Listing displays one of {APP_NAME}&apos;s standard
          cancellation policies, set by the Host. Refund eligibility is
          determined by that policy and the timing of your cancellation
          relative to check-in. See our{" "}
          <a href="/cancellation-policy">Cancellation Policy</a> page for
          full details.
        </p>

        <h2>5. Guest conduct</h2>
        <p>
          Guests agree to follow the house rules posted on each Listing, to
          leave the property in the condition they found it, and to treat
          Hosts and their property with respect. {APP_NAME} may suspend or
          terminate accounts that violate this standard.
        </p>

        <h2>6. Host obligations</h2>
        <p>
          Hosts are responsible for the accuracy of their Listing details
          (location, amenities, pricing, availability) and for maintaining a
          safe, habitable property. Hosts agree to the additional terms in
          our <a href="/host-terms">Host Terms</a>.
        </p>

        <h2>7. Limitation of liability</h2>
        <p>
          {APP_NAME} is provided on an &quot;as is&quot; basis. To the maximum
          extent permitted by law, {APP_NAME} is not liable for indirect,
          incidental, or consequential damages arising from your use of the
          Platform or your stay at a Listing.
        </p>

        <h2>8. Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. Material changes will
          be communicated by email or an in-app notice before they take
          effect.
        </p>

        <h2>9. Contact</h2>
        <p>
          Questions about these Terms? Reach us any time via our{" "}
          <a href="/contact">contact page</a>.
        </p>

        <p className="rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground">
          This page is a template for the {APP_NAME} MVP and has not been
          reviewed by an attorney. It must be reviewed by qualified legal
          counsel before this platform accepts real bookings.
        </p>
      </div>
    </div>
  );
}
