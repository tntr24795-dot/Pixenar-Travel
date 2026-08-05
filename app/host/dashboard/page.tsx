import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowRight, CalendarDays, MessageSquare, PlusCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Host dashboard — Havena",
};

export default async function HostDashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/host/dashboard");
  }

  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("id, stripe_onboarding_complete")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!hostProfile) {
    redirect("/host/onboarding");
  }

  const [{ data: listings }, { data: upcomingBookings }, { data: earningsBookings }] =
    await Promise.all([
      supabase.from("listings").select("id, status").eq("host_id", hostProfile.id),
      supabase
        .from("bookings")
        .select("id, booking_number, check_in, check_out, status, listing_id, total_cents")
        .eq("host_id", user.id)
        .gte("check_in", new Date().toISOString().slice(0, 10))
        .in("status", ["pending_payment", "confirmed"])
        .order("check_in", { ascending: true })
        .limit(5),
      supabase
        .from("bookings")
        .select("host_payout_cents")
        .eq("host_id", user.id)
        .in("status", ["confirmed", "completed"]),
    ]);

  const counts = { active: 0, pending_review: 0, draft: 0, other: 0 };
  for (const listing of listings ?? []) {
    if (listing.status === "active") counts.active += 1;
    else if (listing.status === "pending_review") counts.pending_review += 1;
    else if (listing.status === "draft") counts.draft += 1;
    else counts.other += 1;
  }

  const earningsToDateCents = (earningsBookings ?? []).reduce(
    (sum, b) => sum + b.host_payout_cents,
    0
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-muted-foreground">Here's what's happening with your listings.</p>
      </div>

      {!hostProfile.stripe_onboarding_complete && (
        <Card className="border-havena-gold/50 bg-havena-gold/10">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-havena-gold" />
              <p className="text-sm font-medium">
                Finish setting up payouts to start accepting bookings.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/host/onboarding">Finish setup</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active listings
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{counts.active}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending review
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{counts.pending_review}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Drafts</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{counts.draft}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Earnings to date
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCents(earningsToDateCents)}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming reservations</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingBookings && upcomingBookings.length > 0 ? (
              <ul className="divide-y divide-border">
                {upcomingBookings.map((booking) => (
                  <li key={booking.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <p className="font-medium">{booking.booking_number}</p>
                      <p className="text-muted-foreground">
                        {booking.check_in} → {booking.check_out}
                      </p>
                    </div>
                    <Link
                      href={`/host/reservations/${booking.id}`}
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      View <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No upcoming reservations yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild variant="outline" className="justify-start">
              <Link href="/host/listings/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Create a listing
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/host/calendar">
                <CalendarDays className="mr-2 h-4 w-4" /> View calendar
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/host/messages">
                <MessageSquare className="mr-2 h-4 w-4" /> View messages
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
