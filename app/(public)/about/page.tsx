import type { Metadata } from "next";

import { APP_NAME } from "@/constants";

export const metadata: Metadata = {
  title: `About — ${APP_NAME}`,
  description: `Learn about ${APP_NAME}'s mission to make boutique vacation rentals feel effortless for guests and hosts alike.`,
};

export default function AboutPage() {
  return (
    <div className="container max-w-3xl py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-primary">
        Our story
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        About {APP_NAME}
      </h1>
      <div className="prose prose-neutral mt-8 max-w-none text-foreground/90">
        <p>
          {APP_NAME} started with a simple idea: booking a vacation rental
          should feel as warm and considered as the stay itself. Too many
          booking experiences feel transactional — a wall of thumbnails, a
          confusing fee breakdown, and a listing that looks nothing like the
          place you arrive at.
        </p>
        <p>
          We built {APP_NAME} to be different. Every home on our platform is
          reviewed for accuracy, every price you see is calculated
          transparently before you ever reach checkout, and every host is
          held to a clear, consistent standard for communication and
          hospitality.
        </p>
        <h2>What we believe</h2>
        <ul>
          <li>
            <strong>Transparency first.</strong> The price you see is the
            price you pay — no surprise fees at checkout.
          </li>
          <li>
            <strong>Hosts are hospitality professionals.</strong> We give
            hosts the tools to manage their calendar, pricing, and guest
            communication in one place.
          </li>
          <li>
            <strong>Trust is earned, not assumed.</strong> Reviews, identity
            verification, and responsive support keep both sides of every
            booking accountable.
          </li>
        </ul>
        <h2>Where we operate</h2>
        <p>
          {APP_NAME} connects travelers with boutique stays across the
          United States, with new destinations added all the time — and
          we're building toward a truly global collection of houses,
          cabins, condos, and villas. Wherever we launch next, every host
          is held to the same standard for accuracy, pricing, and
          hospitality.
        </p>
        <p>
          Have questions or want to partner with us? Reach out on our{" "}
          <a href="/contact">contact page</a> — we&apos;d love to hear from
          you.
        </p>
      </div>
    </div>
  );
}
