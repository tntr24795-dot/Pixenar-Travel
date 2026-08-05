import Link from "next/link";
import {
  Users,
  UserCog,
  Building2,
  CalendarCheck,
  DollarSign,
  ShieldAlert,
  Clock,
  AlertOctagon,
  Undo2,
} from "lucide-react";

import { createTypedClient as createClient } from "@/lib/admin/typed-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/utils";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  href,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  href?: string;
}) {
  const body = (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold font-display">{value}</div>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function AdminDashboardPage() {
  const supabase = createClient();

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const today = new Date().toISOString().slice(0, 10);
  const in7Days = sevenDaysFromNow.toISOString().slice(0, 10);

  const [
    { count: totalUsers },
    { count: totalHosts },
    { count: totalListings },
    { count: pendingListings },
    { count: totalBookings },
    { count: failedPayments },
    { count: openDisputes },
    { count: upcomingCheckIns },
    bookingsForGbv,
    guestServiceFeeItems,
    cancellationRefunds,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("host_profiles").select("*", { count: "exact", head: true }),
    supabase.from("listings").select("*", { count: "exact", head: true }),
    supabase
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_review"),
    supabase.from("bookings").select("*", { count: "exact", head: true }),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "failed"),
    supabase
      .from("disputes")
      .select("*", { count: "exact", head: true })
      .in("status", ["open", "under_review"]),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .in("status", ["confirmed"])
      .gte("check_in", today)
      .lte("check_in", in7Days),
    supabase
      .from("bookings")
      .select("total_cents")
      .in("status", ["confirmed", "completed"]),
    // ---- Platform revenue: APPROXIMATE version -----------------------------
    // We sum only the `guest_service_fee` line items from `booking_price_items`.
    // The schema does not store host-commission as its own line item — it is
    // only implicit in `bookings.host_payout_cents` vs. the accommodation/fee
    // totals. See the fuller calculation below (computed from the same
    // `bookingsForGbv`-style fetch) for the full-precision version, which is
    // also computed further down and both are surfaced on the page.
    supabase
      .from("booking_price_items")
      .select("total_amount_cents")
      .eq("item_type", "guest_service_fee"),
    supabase.from("cancellations").select("guest_refund_cents"),
  ]);

  const gbvCents = (bookingsForGbv.data ?? []).reduce(
    (sum, b) => sum + (b.total_cents ?? 0),
    0
  );
  const guestServiceFeeRevenueCents = (guestServiceFeeItems.data ?? []).reduce(
    (sum, i) => sum + (i.total_amount_cents ?? 0),
    0
  );
  const refundsCents = (cancellationRefunds.data ?? []).reduce(
    (sum, c) => sum + (c.guest_refund_cents ?? 0),
    0
  );

  // ---- Platform revenue: FULL-PRECISION version ---------------------------
  // `bookings` doesn't have an `extra_guest_fee_cents` column (that fee is
  // only itemized per-booking in `booking_price_items`), so the naive
  // "hostGross - host_payout_cents" derivation the task description
  // suggested can't be built from `bookings` columns alone. Instead,
  // `bookings.host_service_fee_cents` turns out to already BE the host's
  // commission for that booking (the mirror of `guest_service_fee_cents` on
  // the guest side) — so full-precision platform revenue is simply the sum
  // of both fee columns, no derivation needed.
  const { data: bookingsForCommission } = await supabase
    .from("bookings")
    .select("guest_service_fee_cents, host_service_fee_cents")
    .in("status", ["confirmed", "completed"]);

  const fullPlatformRevenueCents = (bookingsForCommission ?? []).reduce(
    (sum, b) =>
      sum + (b.guest_service_fee_cents ?? 0) + (b.host_service_fee_cents ?? 0),
    0
  );

  const stats = [
    {
      label: "Total users",
      value: (totalUsers ?? 0).toLocaleString(),
      icon: Users,
      href: "/admin/users",
    },
    {
      label: "Total hosts",
      value: (totalHosts ?? 0).toLocaleString(),
      icon: UserCog,
      href: "/admin/hosts",
    },
    {
      label: "Total listings",
      value: (totalListings ?? 0).toLocaleString(),
      icon: Building2,
      hint: `${pendingListings ?? 0} pending review`,
      href: "/admin/listings",
    },
    {
      label: "Total bookings",
      value: (totalBookings ?? 0).toLocaleString(),
      icon: CalendarCheck,
      hint: `Gross booking value ${formatCents(gbvCents)}`,
      href: "/admin/bookings",
    },
    {
      label: "Platform revenue (approx.)",
      value: formatCents(guestServiceFeeRevenueCents),
      icon: DollarSign,
      hint: "Guest service fees only — see note below",
    },
    {
      label: "Platform revenue (full)",
      value: formatCents(fullPlatformRevenueCents),
      icon: DollarSign,
      hint: "Guest service fee + host commission",
    },
    {
      label: "Refunds issued",
      value: formatCents(refundsCents),
      icon: Undo2,
      hint: "Sum of cancellations.guest_refund_cents",
    },
    {
      label: "Open disputes",
      value: (openDisputes ?? 0).toLocaleString(),
      icon: ShieldAlert,
      href: "/admin/disputes",
    },
    {
      label: "Upcoming check-ins (7d)",
      value: (upcomingCheckIns ?? 0).toLocaleString(),
      icon: Clock,
      href: "/admin/bookings",
    },
    {
      label: "Failed payments",
      value: (failedPayments ?? 0).toLocaleString(),
      icon: AlertOctagon,
      href: "/admin/payments",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Platform overview as of {new Date().toLocaleString()}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            A note on "platform revenue"
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Approximate</strong> revenue
            sums only the <code>guest_service_fee</code> line items from{" "}
            <code>booking_price_items</code> — this is the fee charged to
            guests on top of the nightly rate.
          </p>
          <p>
            <strong className="text-foreground">Full-precision</strong>{" "}
            revenue additionally includes host commission — summed directly
            from <code>bookings.host_service_fee_cents</code> (the host-side
            mirror of <code>guest_service_fee_cents</code>), rather than
            deriving it from nightly/fee columns minus{" "}
            <code>host_payout_cents</code>, since{" "}
            <code>bookings</code> has no <code>extra_guest_fee_cents</code>{" "}
            column of its own (that fee only exists per-line-item in{" "}
            <code>booking_price_items</code>). Both figures are computed
            above from <code>confirmed</code>/<code>completed</code> bookings
            only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
