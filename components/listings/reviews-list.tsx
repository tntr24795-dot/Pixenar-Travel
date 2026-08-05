import { Star } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface ReviewItem {
  id: string;
  ratingOverall: number;
  ratingCleanliness: number | null;
  ratingAccuracy: number | null;
  ratingCheckIn: number | null;
  ratingCommunication: number | null;
  ratingLocation: number | null;
  ratingValue: number | null;
  comment: string | null;
  createdAt: string;
  reviewer: { firstName: string | null; avatarUrl: string | null } | null;
}

export interface ReviewsListProps {
  reviews: ReviewItem[];
  averageRating: number;
  reviewCount: number;
}

function average(nums: (number | null)[]): number | null {
  const vals = nums.filter((n): n is number => n != null);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Reviews list with an average-rating-by-category breakdown, for the listing detail page. */
export function ReviewsList({ reviews, averageRating, reviewCount }: ReviewsListProps) {
  const categories: { label: string; value: number | null }[] = [
    { label: "Cleanliness", value: average(reviews.map((r) => r.ratingCleanliness)) },
    { label: "Accuracy", value: average(reviews.map((r) => r.ratingAccuracy)) },
    { label: "Check-in", value: average(reviews.map((r) => r.ratingCheckIn)) },
    { label: "Communication", value: average(reviews.map((r) => r.ratingCommunication)) },
    { label: "Location", value: average(reviews.map((r) => r.ratingLocation)) },
    { label: "Value", value: average(reviews.map((r) => r.ratingValue)) },
  ].filter((c) => c.value != null);

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 fill-current" />
        <h2 className="font-display text-xl font-semibold">
          {averageRating > 0 ? averageRating.toFixed(1) : "New"} · {reviewCount} review
          {reviewCount === 1 ? "" : "s"}
        </h2>
      </div>

      {categories.length > 0 && (
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
          {categories.map((c) => (
            <div key={c.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{c.label}</span>
                <span>{c.value!.toFixed(1)}</span>
              </div>
              <div className="h-1 w-full rounded-full bg-muted">
                <div
                  className="h-1 rounded-full bg-foreground"
                  style={{ width: `${(c.value! / 5) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {reviews.map((review) => (
            <div key={review.id} className="space-y-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={review.reviewer?.avatarUrl ?? undefined}
                    alt={review.reviewer?.firstName ?? "Guest"}
                  />
                  <AvatarFallback>{(review.reviewer?.firstName ?? "G").slice(0, 1)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{review.reviewer?.firstName ?? "Guest"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              {review.comment && <p className="text-sm text-foreground/90">{review.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
