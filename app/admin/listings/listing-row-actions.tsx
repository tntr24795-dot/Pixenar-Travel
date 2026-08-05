"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { suspendListing } from "./actions";

export function ListingRowActions({
  listingId,
  status,
}: {
  listingId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  async function callRoute(action: "approve" | "reject") {
    const res = await fetch(`/api/admin/listings/${listingId}/${action}`, {
      method: "POST",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Failed to ${action} listing`);
    }
  }

  function handleApprove() {
    startTransition(async () => {
      try {
        await callRoute("approve");
        toast({ title: "Listing approved" });
        router.refresh();
      } catch (err) {
        toast({
          title: "Approve failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      }
    });
  }

  function handleReject() {
    startTransition(async () => {
      try {
        await callRoute("reject");
        toast({ title: "Listing rejected" });
        router.refresh();
      } catch (err) {
        toast({
          title: "Reject failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      }
    });
  }

  function handleSuspend() {
    startTransition(async () => {
      try {
        await suspendListing(listingId);
        toast({ title: "Listing suspended" });
        router.refresh();
      } catch (err) {
        toast({
          title: "Suspend failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="flex justify-end gap-2">
      {status === "pending_review" && (
        <>
          <Button size="sm" variant="secondary" disabled={isPending} onClick={handleApprove}>
            Approve
          </Button>
          <Button size="sm" variant="destructive" disabled={isPending} onClick={handleReject}>
            Reject
          </Button>
        </>
      )}
      {status === "active" && (
        <Button size="sm" variant="destructive" disabled={isPending} onClick={handleSuspend}>
          Suspend
        </Button>
      )}
    </div>
  );
}
