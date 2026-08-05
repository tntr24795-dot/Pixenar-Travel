"use client";

import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

// There is no notification-preferences table in the schema, so these
// checkboxes are local-only UI state for this MVP — they don't persist
// anywhere yet. A real implementation would need a
// `notification_preferences` table (or columns on `profiles`) plus the email
// send paths (Resend) actually checking them before sending.
const PREFERENCE_OPTIONS = [
  { key: "bookingUpdates", label: "Booking confirmations & updates", defaultChecked: true },
  { key: "messages", label: "New message alerts", defaultChecked: true },
  { key: "tripReminders", label: "Trip reminders", defaultChecked: true },
  { key: "offers", label: "Offers & promotions", defaultChecked: false },
] as const;

export function EmailPreferencesForm() {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PREFERENCE_OPTIONS.map((o) => [o.key, o.defaultChecked]))
  );

  function toggle(key: string) {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function save() {
    // Nothing to persist yet — see the note above.
    toast({ title: "Preferences saved for this session" });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {PREFERENCE_OPTIONS.map((option) => (
          <div key={option.key} className="flex items-center gap-2">
            <Checkbox
              id={option.key}
              checked={preferences[option.key]}
              onCheckedChange={() => toggle(option.key)}
            />
            <Label htmlFor={option.key} className="font-normal">
              {option.label}
            </Label>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={save}
        className="text-sm font-medium text-primary hover:underline"
      >
        Save preferences
      </button>
    </div>
  );
}
