import { createTypedClient as createClient } from "@/lib/admin/typed-client";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HostRowActions } from "./host-row-actions";

export const dynamic = "force-dynamic";

export default async function AdminHostsPage() {
  const supabase = createClient();

  const { data: hosts, error } = await supabase
    .from("host_profiles")
    .select(
      "id, user_id, identity_status, stripe_onboarding_complete, charges_enabled, payouts_enabled, average_rating, total_reviews, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`Failed to load hosts: ${error.message}`);
  }

  const userIds = (hosts ?? []).map((h) => h.user_id);
  const { data: profiles } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", userIds)
      : { data: [] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Hosts</h1>
        <p className="text-sm text-muted-foreground">
          {(hosts ?? []).length} host{(hosts ?? []).length === 1 ? "" : "s"}{" "}
          shown (max 200).
        </p>
      </div>

      <div className="rounded-lg border border-border bg-background">
        {!hosts || hosts.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No hosts yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Host</TableHead>
                <TableHead>Identity</TableHead>
                <TableHead>Stripe onboarding</TableHead>
                <TableHead>Charges</TableHead>
                <TableHead>Payouts</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hosts.map((h) => {
                const profile = profileById.get(h.user_id);
                return (
                  <TableRow key={h.id}>
                    <TableCell>
                      <div className="font-medium">
                        {profile
                          ? [profile.first_name, profile.last_name]
                              .filter(Boolean)
                              .join(" ") || profile.email
                          : h.user_id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {profile?.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          h.identity_status === "verified"
                            ? "secondary"
                            : h.identity_status === "rejected"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {h.identity_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {h.stripe_onboarding_complete ? "Complete" : "Incomplete"}
                    </TableCell>
                    <TableCell>{h.charges_enabled ? "Enabled" : "Disabled"}</TableCell>
                    <TableCell>{h.payouts_enabled ? "Enabled" : "Disabled"}</TableCell>
                    <TableCell>
                      {h.average_rating > 0
                        ? `${h.average_rating.toFixed(2)} (${h.total_reviews})`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <HostRowActions
                        hostProfileId={h.id}
                        identityStatus={h.identity_status}
                      />
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
