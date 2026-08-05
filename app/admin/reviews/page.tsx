import { createTypedClient as createClient } from "@/lib/admin/typed-client";
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
import { ReviewRowActions } from "./review-row-actions";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createClient();
  const { status = "" } = searchParams;

  let query = supabase
    .from("reviews")
    .select(
      "id, listing_id, guest_id, host_id, rating_overall, comment, status, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) query = query.eq("status", status);

  const { data: reviews, error } = await query;
  if (error) {
    throw new Error(`Failed to load reviews: ${error.message}`);
  }

  const listingIds = Array.from(new Set((reviews ?? []).map((r) => r.listing_id)));
  const guestIds = Array.from(new Set((reviews ?? []).map((r) => r.guest_id)));

  const [{ data: listings }, { data: guests }] = await Promise.all([
    listingIds.length > 0
      ? supabase.from("listings").select("id, title").in("id", listingIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    guestIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", guestIds)
      : Promise.resolve({
          data: [] as { id: string; first_name: string | null; last_name: string | null; email: string }[],
        }),
  ]);

  const listingById = new Map((listings ?? []).map((l) => [l.id, l]));
  const guestById = new Map((guests ?? []).map((g) => [g.id, g]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Reviews</h1>
        <p className="text-sm text-muted-foreground">
          {(reviews ?? []).length} review{(reviews ?? []).length === 1 ? "" : "s"}{" "}
          shown (max 200), including hidden.
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
            <option value="published">Published</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
        <Button type="submit">Filter</Button>
      </form>

      <div className="rounded-lg border border-border bg-background">
        {!reviews || reviews.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No reviews match this filter.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Listing</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((r) => {
                const guest = guestById.get(r.guest_id);
                return (
                  <TableRow key={r.id}>
                    <TableCell>{listingById.get(r.listing_id)?.title ?? "—"}</TableCell>
                    <TableCell>
                      {guest
                        ? [guest.first_name, guest.last_name].filter(Boolean).join(" ") ||
                          guest.email
                        : "—"}
                    </TableCell>
                    <TableCell>{r.rating_overall} / 5</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {r.comment ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === "published" ? "secondary" : "destructive"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ReviewRowActions reviewId={r.id} status={r.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
