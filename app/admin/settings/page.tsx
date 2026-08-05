import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const HARDCODED_DEFAULTS = [
  {
    key: "guestServiceFeePercent",
    label: "Guest service fee",
    value: "10%",
    note: "Charged on top of the discounted nightly subtotal.",
  },
  {
    key: "hostCommissionPercent",
    label: "Host commission",
    value: "10%",
    note: "Deducted from the host's gross earnings before payout.",
  },
  {
    key: "taxRatePercent",
    label: "Tax rate",
    value: "0%",
    note: "Must be configured per jurisdiction before going live.",
  },
] as const;

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Platform-level pricing defaults — currently read-only.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current hardcoded defaults</CardTitle>
          <CardDescription>
            These values live as the default parameters of{" "}
            <code>QuoteOptions</code> inside{" "}
            <code>lib/pricing/calculateBookingQuote.ts</code>. They are{" "}
            <strong>not</strong> stored in the database — every quote call
            that doesn't explicitly override them falls back to these
            numbers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border rounded-md border border-border">
            {HARDCODED_DEFAULTS.map((d) => (
              <div
                key={d.key}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div>
                  <p className="font-medium">{d.label}</p>
                  <p className="text-sm text-muted-foreground">{d.note}</p>
                  <code className="text-xs text-muted-foreground">
                    QuoteOptions.{d.key}
                  </code>
                </div>
                <Badge variant="outline" className="text-base">
                  {d.value}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">
            Making these admin-editable — the honest gap
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This page is intentionally read-only. Turning these into
            admin-editable settings is <strong>more than a UI change</strong>{" "}
            and shouldn't be done unilaterally by this admin-dashboard slice
            without checking with whoever owns the schema/pricing engine,
            because it requires:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              A new <code>platform_settings</code> table (or a single-row
              config table) with RLS that allows admin read/write and,
              critically, safe server-side read access for every code path
              that currently calls <code>calculateBookingQuote()</code> —
              this table does not exist yet in{" "}
              <code>supabase/migrations/0001_schema.sql</code>.
            </li>
            <li>
              Wiring every caller of <code>calculateBookingQuote()</code>{" "}
              (search cards, listing page, checkout, the PaymentIntent
              amount) to load the current rates from that table instead of
              relying on the function's built-in defaults — and doing so
              from server-loaded data only, never trusting a rate from the
              browser.
            </li>
            <li>
              Deciding whether rate changes apply retroactively to
              in-flight quotes/holds or only to quotes computed after the
              change (almost certainly the latter, to avoid mid-checkout
              price changes).
            </li>
          </ul>
          <p>
            None of that is implemented here — this page only documents the
            current defaults so admins have visibility into what they are.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
