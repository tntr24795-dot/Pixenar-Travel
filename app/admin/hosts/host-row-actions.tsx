"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { setHostIdentityStatus } from "./actions";

export function HostRowActions({
  hostProfileId,
  identityStatus,
}: {
  hostProfileId: string;
  identityStatus: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function act(next: "verified" | "rejected") {
    startTransition(async () => {
      try {
        await setHostIdentityStatus(hostProfileId, next);
        toast({
          title: next === "verified" ? "Host verified" : "Host rejected",
        });
        router.refresh();
      } catch (err) {
        toast({
          title: "Action failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="flex justify-end gap-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={isPending || identityStatus === "verified"}
        onClick={() => act("verified")}
      >
        Verify
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={isPending || identityStatus === "rejected"}
        onClick={() => act("rejected")}
      >
        Reject
      </Button>
    </div>
  );
}
