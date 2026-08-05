"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

interface CancelBookingButtonProps {
  bookingId: string;
}

/**
 * Cancellation logic (refund math, policy application, status transitions)
 * lives server-side in `/api/bookings/[id]/cancel`, owned by the
 * booking/Stripe agent. This button just calls it and reflects the result —
 * it never reimplements cancellation/refund rules itself.
 */
export function CancelBookingButton({ bookingId }: CancelBookingButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleCancel() {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn't cancel this booking. Please try again.");
      }

      toast({ title: "Booking cancelled" });
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast({
        title: "Cancellation failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Cancel booking</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this booking?</DialogTitle>
          <DialogDescription>
            This can&apos;t be undone. Any refund you&apos;re owed depends on the listing&apos;s
            cancellation policy and how close to check-in you are.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Keep booking
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={isSubmitting}>
            {isSubmitting ? "Cancelling…" : "Yes, cancel booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
