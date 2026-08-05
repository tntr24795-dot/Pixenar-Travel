import type { Metadata } from "next";
import { AlertTriangle, CalendarClock, ShieldCheck, ShieldX } from "lucide-react";

import { APP_NAME, CANCELLATION_POLICIES } from "@/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: `Cancellation Policy — ${APP_NAME}`,
  description: `Learn how Flexible, Moderate, and Strict cancellation policies work on ${APP_NAME}.`,
};

const POLICY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  flexible: ShieldCheck,
  moderate: CalendarClock,
  strict: ShieldX,
};

export default function CancellationPolicyPage() {
  return (
    <div className="container max-w-3xl py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
        Cancellation Policy
      </h1>
      <p className="mt-4 max-w-2xl text-foreground/90">
        Every {APP_NAME} Listing uses one of three standard cancellation
        policies, chosen by the Host and shown clearly on the Listing page
        and at checkout before you book. Refund eligibility depends on which
        policy applies to your booking and how far in advance of check-in
        you cancel.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-1">
        {CANCELLATION_POLICIES.map((policy) => {
          const Icon = POLICY_ICONS[policy.value] ?? ShieldCheck;
          return (
            <Card key={policy.value}>
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">{policy.label}</CardTitle>
                  <CardDescription className="mt-1">
                    {policy.description}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                This policy is set by the Host for their Listing and applies
                to the full reservation, including all guests on the
                booking. The exact cutoff and refund percentage are shown
                again at checkout before you confirm payment.
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-10 space-y-4 text-foreground/90">
        <h2 className="font-display text-2xl font-semibold">
          A few things to know
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>
            The service fee is generally non-refundable, except where a
            Host cancels a confirmed booking.
          </li>
          <li>
            Refunds are issued back to the original payment method and can
            take several business days to appear, depending on your bank.
          </li>
          <li>
            If a Host cancels a confirmed booking, the Guest receives a full
            refund regardless of the Listing&apos;s stated policy.
          </li>
          <li>
            Extenuating-circumstances exceptions (e.g. severe weather,
            documented medical emergencies) may be reviewed by {APP_NAME}{" "}
            support on a case-by-case basis.
          </li>
        </ul>
      </div>

      <div className="mt-10 flex items-start gap-3 rounded-md border border-accent/40 bg-accent/10 p-4 text-sm text-foreground">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent-foreground" />
        <p>
          <strong>Legal disclaimer:</strong> the policy names, descriptions,
          and refund language on this page are a placeholder for the{" "}
          {APP_NAME} MVP. The exact refund wording, cutoff windows, and
          extenuating-circumstances process must be reviewed and approved by
          qualified legal counsel before this platform accepts real
          bookings.
        </p>
      </div>
    </div>
  );
}
