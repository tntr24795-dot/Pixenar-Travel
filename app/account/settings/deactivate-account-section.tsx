"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
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

interface DeactivateAccountSectionProps {
  userId: string;
  currentStatus: string;
}

/**
 * Updates the user's own `profiles.status` to "suspended" directly from the
 * browser. `profiles_update_own` (`id = auth.uid()`) permits this — that
 * policy doesn't restrict which columns can change, so a user updating their
 * own `status` is technically allowed today. A hardened version would need a
 * column-level restriction (e.g. a trigger that rejects status changes from
 * non-admins, or routing this through a view/RPC that only allows the
 * 'active' -> 'suspended' transition) rather than trusting the open
 * `profiles_update_own` policy for a security-relevant column like this.
 */
export function DeactivateAccountSection({ userId, currentStatus }: DeactivateAccountSectionProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  if (currentStatus === "suspended") {
    return (
      <p className="text-sm text-muted-foreground">
        Your account is currently deactivated. Contact support to reactivate it.
      </p>
    );
  }

  async function handleDeactivate() {
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ status: "suspended" })
        .eq("id", userId);

      if (error) throw error;

      toast({ title: "Account deactivated" });
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast({
        title: "Couldn't deactivate account",
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
        <Button variant="destructive">Deactivate account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deactivate your account?</DialogTitle>
          <DialogDescription>
            You&apos;ll be signed out and won&apos;t be able to book new stays until you
            contact support to reactivate your account.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDeactivate} disabled={isSubmitting}>
            {isSubmitting ? "Deactivating…" : "Yes, deactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
