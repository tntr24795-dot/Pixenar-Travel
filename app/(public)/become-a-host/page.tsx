import type { Metadata } from "next";
import Link from "next/link";
import { BadgeDollarSign, CalendarCheck, MessageCircle, ShieldCheck } from "lucide-react";

import { APP_NAME } from "@/constants";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: `Become a Host — ${APP_NAME}`,
  description: `Earn income by hosting your property on ${APP_NAME}. Set your own price, calendar, and house rules.`,
};

const BENEFITS = [
  {
    icon: BadgeDollarSign,
    title: "Set your own price",
    description:
      "You control your nightly rate, weekend pricing, cleaning fee, and discounts — our pricing engine handles the math at checkout.",
  },
  {
    icon: CalendarCheck,
    title: "Stay in control of your calendar",
    description:
      "Block dates, set minimum/maximum night stays, and approve instant-book preferences from your Host dashboard.",
  },
  {
    icon: ShieldCheck,
    title: "Verified guests, protected payouts",
    description:
      "Guests are identity-verified before checkout, and payouts are handled securely through our payment processor.",
  },
  {
    icon: MessageCircle,
    title: "Direct messaging with guests",
    description:
      "Answer questions and coordinate check-in details through built-in messaging — no need to share personal contact info.",
  },
];

export default async function BecomeAHostPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ctaHref = user ? "/host/onboarding" : "/signup?next=/host/onboarding";

  return (
    <div>
      <div className="border-b border-border bg-secondary/40">
        <div className="container max-w-4xl py-20 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-primary">
            Hosting on {APP_NAME}
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Turn your space into a stay guests remember
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-foreground/80">
            Join a curated marketplace of boutique vacation rentals. List
            your property in minutes and start welcoming guests on your
            terms.
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href={ctaHref}>Start hosting</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl py-16">
        <h2 className="text-center font-display text-3xl font-semibold text-foreground">
          Why host with {APP_NAME}
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {BENEFITS.map((benefit) => (
            <Card key={benefit.title}>
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent-foreground">
                  <benefit.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{benefit.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {benefit.description}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 rounded-lg border border-border bg-secondary/40 p-8 text-center">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Onboarding takes about 10 minutes: property details, photos,
            pricing, and identity verification. You can save your progress
            and finish later.
          </p>
          <div className="mt-6">
            <Button asChild size="lg">
              <Link href={ctaHref}>Become a host</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
