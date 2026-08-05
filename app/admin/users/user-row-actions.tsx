"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { toggleUserStatus } from "./actions";

export function UserRowActions({
  profileId,
  status,
}: {
  profileId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const nextStatus = status === "suspended" ? "active" : "suspended";

  function handleClick() {
    startTransition(async () => {
      try {
        await toggleUserStatus(profileId, nextStatus);
        toast({
          title:
            nextStatus === "suspended" ? "User suspended" : "User reactivated",
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
    <Button
      size="sm"
      variant={nextStatus === "suspended" ? "destructive" : "secondary"}
      disabled={isPending}
      onClick={handleClick}
    >
      {nextStatus === "suspended" ? "Suspend" : "Reactivate"}
    </Button>
  );
}
