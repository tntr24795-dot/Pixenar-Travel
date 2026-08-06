import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";

import { APP_NAME } from "@/constants";

export const metadata: Metadata = {
  title: `Help Center — ${APP_NAME}`,
  description: `Answers to common questions about booking, hosting, payments, and cancellations on ${APP_NAME}.`,
};

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSection {
  title: string;
  items: FaqItem[];
}

const FAQ_SECTIONS: FaqSection[] = [
  {
    title: "Booking",
    items: [
      {
        question: "How do I book a stay?",
        answer:
          "Search for a destination and dates on the Explore page, open a Listing you like, and select \"Reserve.\" You'll see the full price breakdown before you confirm and pay.",
      },
      {
        question: "Why does the price change when I add dates or guests?",
        answer:
          "Pricing (nightly rate, weekend rate, cleaning fee, extra-guest fee, discounts) is calculated fresh from the Host's settings every time you change your dates or guest count, so the total you see is always accurate.",
      },
      {
        question: "Can I message a Host before booking?",
        answer:
          "Yes — every Listing page has a \"Contact host\" option so you can ask questions about the property before you reserve.",
      },
      {
        question: "When will I see the exact address?",
        answer:
          "For your privacy and the Host's, only the city and general area are shown before booking. The full address is released once your booking is confirmed.",
      },
    ],
  },
  {
    title: "Hosting",
    items: [
      {
        question: "How do I list my property?",
        answer:
          "Create an account, then start the host onboarding flow from \"Become a host.\" You'll walk through property type, location, capacity, amenities, photos, pricing, and your cancellation policy.",
      },
      {
        question: "How do I get paid?",
        answer:
          "You'll connect a payout account during onboarding. Payouts are released automatically after a Guest's stay begins, minus the Pixenar Travel service fee.",
      },
      {
        question: "Can I set my own cancellation policy?",
        answer:
          "You choose from three standard policies — Flexible, Moderate, or Strict — for each Listing. See our Cancellation Policy page for details.",
      },
    ],
  },
  {
    title: "Payments",
    items: [
      {
        question: "What payment methods are accepted?",
        answer:
          "Pixenar Travel accepts major credit and debit cards through our PCI-compliant payment processor. We never store your full card number.",
      },
      {
        question: "Is my payment held until I check in?",
        answer:
          "Your card is charged when your booking is confirmed, which finalizes your reserved dates. Host payouts are released on the schedule shown in the Host dashboard.",
      },
      {
        question: "Why was my card charged but my booking not confirmed?",
        answer:
          "This can happen if someone else booked the same dates in the moments between payment and confirmation. If that happens, you're automatically refunded in full and shown a friendly notice to pick new dates.",
      },
    ],
  },
  {
    title: "Cancellations",
    items: [
      {
        question: "How do I cancel a booking?",
        answer:
          "Go to Trips in your account, open the booking, and select \"Cancel booking.\" Your refund amount depends on the Listing's cancellation policy and how far ahead of check-in you cancel.",
      },
      {
        question: "What if the Host cancels on me?",
        answer:
          "If a Host cancels a confirmed booking, you receive a full refund regardless of the stated cancellation policy.",
      },
      {
        question: "Where can I read the exact refund rules?",
        answer:
          "Visit our Cancellation Policy page for a full breakdown of the Flexible, Moderate, and Strict policies.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="container max-w-3xl py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
        Help center
      </h1>
      <p className="mt-4 max-w-2xl text-foreground/90">
        Answers to the questions we hear most from guests and hosts. Can not
        find what you need?{" "}
        <a href="/contact" className="text-primary underline underline-offset-4">
          Contact our team
        </a>
        .
      </p>

      <div className="mt-10 space-y-10">
        {FAQ_SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              {section.title}
            </h2>
            <div className="mt-4 divide-y divide-border rounded-lg border border-border">
              {section.items.map((item) => (
                <details key={item.question} className="group p-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-foreground">
                    {item.question}
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
