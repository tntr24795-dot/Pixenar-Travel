"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { createReviewSchema, type CreateReviewInput } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface ReviewFormProps {
  bookingId: string;
  guestId: string;
  hostId: string;
  listingId: string;
}

const RATING_FIELDS: { key: keyof CreateReviewInput; label: string; required?: boolean }[] = [
  { key: "ratingOverall", label: "Overall", required: true },
  { key: "ratingCleanliness", label: "Cleanliness" },
  { key: "ratingAccuracy", label: "Accuracy" },
  { key: "ratingCheckIn", label: "Check-in" },
  { key: "ratingCommunication", label: "Communication" },
  { key: "ratingLocation", label: "Location" },
  { key: "ratingValue", label: "Value" },
];

/**
 * Inserts directly into `reviews` from the browser. This is safe because the
 * `reviews_insert_own_completed_booking` RLS policy re-checks, server-side,
 * that `guest_id = auth.uid()` AND the referenced booking belongs to that
 * guest AND is `status = 'completed'` — regardless of what this form sends.
 */
export function ReviewForm({ bookingId, guestId, hostId, listingId }: ReviewFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateReviewInput>({
    resolver: zodResolver(createReviewSchema),
    defaultValues: { bookingId, ratingOverall: 5 },
  });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("reviews").insert({
        booking_id: values.bookingId,
        guest_id: guestId,
        host_id: hostId,
        listing_id: listingId,
        rating_overall: values.ratingOverall,
        rating_cleanliness: values.ratingCleanliness ?? null,
        rating_accuracy: values.ratingAccuracy ?? null,
        rating_check_in: values.ratingCheckIn ?? null,
        rating_communication: values.ratingCommunication ?? null,
        rating_location: values.ratingLocation ?? null,
        rating_value: values.ratingValue ?? null,
        comment: values.comment || null,
      });

      if (error) throw error;

      toast({ title: "Thanks for your review!" });
      router.refresh();
    } catch (err) {
      toast({
        title: "Couldn't submit your review",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {RATING_FIELDS.map(({ key, label, required }) => (
          <div key={key} className="space-y-1.5">
            <Label>
              {label}
              {required ? " *" : ""}
            </Label>
            <Controller
              control={control}
              name={key}
              render={({ field }) => (
                <StarRating
                  value={typeof field.value === "number" ? field.value : 0}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="comment">Comment</Label>
        <Textarea
          id="comment"
          rows={4}
          placeholder="How was your stay?"
          {...register("comment")}
        />
        {errors.comment && (
          <p className="text-xs text-destructive">{errors.comment.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          className="p-0.5"
        >
          <Star
            className={cn(
              "h-5 w-5",
              n <= value ? "fill-accent text-accent" : "text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  );
}
