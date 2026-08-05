import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatCents, cn } from "@/lib/utils";

export interface ListingCardProps {
  slug: string;
  title: string;
  city?: string | null;
  state?: string | null;
  nightlyPriceCents: number;
  currency?: string;
  averageRating?: number;
  reviewCount?: number;
  instantBook?: boolean;
  coverImage?: { publicUrl: string; altText?: string | null } | null;
  className?: string;
}

/**
 * Presentational listing card -- used by the search results grid and any
 * "featured listings" section on the homepage. Accepts props only; it never
 * fetches its own data.
 */
export function ListingCard({
  slug,
  title,
  city,
  state,
  nightlyPriceCents,
  currency = "USD",
  averageRating,
  reviewCount,
  instantBook,
  coverImage,
  className,
}: ListingCardProps) {
  const location = [city, state].filter(Boolean).join(", ");

  return (
    <Link href={`/listing/${slug}`} className={cn("group block", className)}>
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
        {coverImage ? (
          <Image
            src={coverImage.publicUrl}
            alt={coverImage.altText ?? title}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No photo yet
          </div>
        )}
        {instantBook && (
          <Badge variant="secondary" className="absolute left-2 top-2 bg-background/90 text-foreground">
            Instant Book
          </Badge>
        )}
      </div>

      <div className="mt-2 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-medium text-foreground">{location || title}</p>
          {!!averageRating && (
            <span className="flex shrink-0 items-center gap-1 text-sm text-foreground">
              <Star className="h-3.5 w-3.5 fill-current" />
              {averageRating.toFixed(1)}
              {!!reviewCount && <span className="text-muted-foreground">({reviewCount})</span>}
            </span>
          )}
        </div>
        <p className="truncate text-sm text-muted-foreground">{title}</p>
        <p className="text-sm">
          <span className="font-semibold text-foreground">{formatCents(nightlyPriceCents, currency)}</span>{" "}
          <span className="text-muted-foreground">/ night</span>
        </p>
      </div>
    </Link>
  );
}
