import Link from "next/link";
import { notFound } from "next/navigation";

import { createTypedClient as createClient } from "@/lib/admin/typed-client";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DisputeForm } from "./dispute-form";

export const dynamic = "force-dynamic";

export default async function AdminDisputeDetailPage({
  params,
}: {
  params: { disputeId: string };
}) {
  const supabase = createClient();

  const { data: dispute, error } = await supabase
    .from("disputes")
    .select("*")
    .eq("id", params.disputeId)
    .single();

  if (error || !dispute) {
    notFound();
  }

  const [{ data: booking }, { data: openedBy }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, booking_number, listing_id, guest_id, host_id")
      .eq("id", dispute.booking_id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("id", dispute.opened_by)
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            Dispute — {dispute.reason}
          </h1>
          <p className="text-sm text-muted-foreground">
            Filed {new Date(dispute.created_at).toLocaleString()}
          </p>
        </div>
        <Badge>{dispute.status}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Booking</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {booking ? (
              <Link
                href={`/admin/bookings/${booking.id}`}
                className="font-medium hover:underline"
              >
                {booking.booking_number}
              </Link>
            ) : (
              <p className="text-muted-foreground">Booking not found</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Opened by</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {openedBy ? (
              <>
                <p className="font-medium">
                  {[openedBy.first_name, openedBy.last_name]
                    .filter(Boolean)
                    .join(" ") || openedBy.email}
                </p>
                <p className="text-muted-foreground">{openedBy.email}</p>
              </>
            ) : (
              <p className="text-muted-foreground">Unknown</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Guest description</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {dispute.description || "No description provided."}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manage dispute</CardTitle>
        </CardHeader>
        <CardContent>
          <DisputeForm
            disputeId={dispute.id}
            initialStatus={dispute.status}
            initialAdminNotes={dispute.admin_notes ?? ""}
            initialResolution={dispute.resolution ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}
