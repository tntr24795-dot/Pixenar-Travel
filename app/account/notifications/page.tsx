import { Bell, CalendarCheck, MessageCircle, Tag } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

// There is no `notifications` table in the current schema
// (types/database.ts / supabase/migrations/0001_schema.sql) — this page is a
// static/derived MVP placeholder rather than a real feed. A durable
// notifications system (table + triggers or a fan-out job that turns
// booking-status changes, new messages, and reminders into rows a user can
// mark read) is a deliberate post-MVP addition, not something to invent here
// with a new migration.
export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Notifications</h1>
        <p className="text-muted-foreground">Stay on top of your bookings and messages.</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Bell className="h-8 w-8 text-muted-foreground" />
          <p className="max-w-sm text-muted-foreground">
            You&apos;ll see booking confirmations, new messages, and trip reminders here once
            they happen. Notifications aren&apos;t stored yet in this MVP — for now, check{" "}
            <span className="font-medium text-foreground">Trips</span> and{" "}
            <span className="font-medium text-foreground">Messages</span> directly.
          </p>
          <div className="mt-4 grid gap-3 text-left text-sm sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-md border border-border p-3">
              <CalendarCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
              Booking confirmations
            </div>
            <div className="flex items-center gap-2 rounded-md border border-border p-3">
              <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
              New messages
            </div>
            <div className="flex items-center gap-2 rounded-md border border-border p-3">
              <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
              Trip reminders &amp; offers
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
