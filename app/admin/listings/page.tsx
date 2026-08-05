import Link from "next/link";

import { createTypedClient as createClient } from "@/lib/admin/typed-client";
import { LISTING_STATUSES } from "@/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/lib/utils";
import { ListingRowActions } from "./listing-row-actions";

export const dynamic = "force-dynamic";

function statusVariant(status: string): "secondary" | "destructive" | "outline" {
  if (status === "active") return "secondary";
  if (status === "rejected" || status === "suspended") return "destructive";
  return "outline";
}

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createClient();
  const { status = "" } = searchParams;

  let query = supabase
    .from("listings")
    .select(
      "id, title, slug, status, city, state, host_id, base_price_cents, currency, published_at, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) {
    query = query.eq("status", status);
  }

  const { data: listings, error } = await query;
  if (error) {
    throw new Error(`Failed to load listings: ${error.message}`);
  }

  const hostProfileIds = Array.from(
    new Set((listings ?? []).map((l) => l.host_id))
  );
  const { data: hostProfiles } =
    hostProfileIds.length > 0
      ? await supabase
          .from("host_profiles")
          .select("id, user_id")
          .in("id", hostProfileIds)
      : { data: [] };

  const userIds = Array.from(
    new Set((hostProfiles ?? []).map((h) => h.user_id))
  );
  const { data: profiles } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", userIds)
      : { data: [] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const hostProfileById = new Map(
    (hostProfiles ?? []).map((h) => [h.id, h])
  );

  function hostLabel(hostId: string) {
    const hp = hostProfileById.get(hostId);
    const profile = hp ? profileById.get(hp.user_id) : undefined;
    if (!profile) return "—";
    return (
      [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
      profile.email
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Listings</h1>
        <p className="text-sm text-muted-foreground">
          {(listings ?? []).length} listing
          {(listings ?? []).length === 1 ? "" : "s"} shown (max 200).
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-background p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="h-10 w-48 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All statuses</option>
            {LISTING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Filter</Button>
      </form>

      <div className="rounded-lg border border-border bg-background">
        {!listings || listings.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No listings match this filter.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Base price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/listing/${l.slug}`}
                      target="_blank"
                      className="hover:underline"
                    >
                      {l.title}
                    </Link>
                  </TableCell>
                  <TableCell>{hostLabel(l.host_id)}</TableCell>
                  <TableCell>
                    {[l.city, l.state].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(l.status)}>{l.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {formatCents(l.base_price_cents, l.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ListingRowActions listingId={l.id} status={l.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
