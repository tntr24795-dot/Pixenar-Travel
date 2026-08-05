"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { updateDispute, type UpdateDisputeInput } from "../actions";

const DISPUTE_STATUSES = ["open", "under_review", "resolved", "closed"] as const;

export function DisputeForm({
  disputeId,
  initialStatus,
  initialAdminNotes,
  initialResolution,
}: {
  disputeId: string;
  initialStatus: string;
  initialAdminNotes: string;
  initialResolution: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [adminNotes, setAdminNotes] = useState(initialAdminNotes);
  const [resolution, setResolution] = useState(initialResolution);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateDispute(disputeId, {
          status: status as UpdateDisputeInput["status"],
          adminNotes,
          resolution,
        });
        toast({ title: "Dispute updated" });
        router.refresh();
      } catch (err) {
        toast({
          title: "Update failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 w-56 rounded-md border border-input bg-background px-3 text-sm"
        >
          {DISPUTE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="admin_notes">Admin notes (internal)</Label>
        <Textarea
          id="admin_notes"
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={4}
          placeholder="Internal notes about this dispute..."
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="resolution">Resolution</Label>
        <Textarea
          id="resolution"
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          rows={3}
          placeholder="How this dispute was resolved..."
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
