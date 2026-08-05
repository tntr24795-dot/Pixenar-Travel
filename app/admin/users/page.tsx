import { createTypedClient as createClient } from "@/lib/admin/typed-client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserRowActions } from "./user-row-actions";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  role?: string;
  status?: string;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const { q = "", role = "", status = "" } = searchParams;

  let query = supabase
    .from("profiles")
    .select("id, email, first_name, last_name, role, status, phone, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (q) {
    query = query.or(
      `email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`
    );
  }
  if (role) {
    query = query.eq("role", role);
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data: users, error } = await query;

  if (error) {
    throw new Error(`Failed to load users: ${error.message}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">
          {(users ?? []).length} user{(users ?? []).length === 1 ? "" : "s"}{" "}
          shown (max 200).
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-background p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q"
            name="q"
            placeholder="Name or email"
            defaultValue={q}
            className="w-56"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            name="role"
            defaultValue={role}
            className="h-10 w-40 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All roles</option>
            <option value="traveler">Traveler</option>
            <option value="host">Host</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="h-10 w-40 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <Button type="submit">Filter</Button>
      </form>

      <div className="rounded-lg border border-border bg-background">
        {!users || users.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No users match these filters.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {[u.first_name, u.last_name].filter(Boolean).join(" ") ||
                      "—"}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell className="capitalize">{u.role}</TableCell>
                  <TableCell>
                    <Badge
                      variant={u.status === "active" ? "secondary" : "destructive"}
                    >
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <UserRowActions profileId={u.id} status={u.status} />
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
