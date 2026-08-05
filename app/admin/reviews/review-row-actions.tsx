"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { toggleReviewStatus } from "./actions";

export function ReviewRowActions({
  reviewId,
  status,
}: {
  reviewId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const nextStatus = status === "hidden" ? "published" : "hidden";

  function handleClick() {
    startTransition(async () => {
      try {
        await toggleReviewStatus(reviewId, nextStatus);
        toast({
          title: nextStatus === "hidden" ? "Review hidden" : "Review published",
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
      variant={nextStatus === "hidden" ? "destructive" : "secondary"}
      disabled={isPending}
      onClick={handleClick}
    >
      {nextStatus === "hidden" ? "Hide" : "Publish"}
    </Button>
  );
}
