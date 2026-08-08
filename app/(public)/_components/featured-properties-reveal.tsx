"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";

import { formatCents } from "@/lib/utils";

export interface FeaturedProperty {
  slug: string;
  title: string;
  city: string | null;
  state: string | null;
  basePriceCents: number;
  currency: string;
  averageRating: number;
  reviewCount: number;
  coverImageUrl: string | null;
}

let registered = false;

/**
 * Client wrapper for the "Destinations reveal" scroll beat: featured listing
 * cards animate in with `gsap.from` + stagger as the section scrolls into
 * view (in parallel with the hero canvas's camera dolly + bloom ramp, which
 * is wired separately in `ScrollRig` against this same `#destinations` element).
 */
export function FeaturedPropertiesReveal({ properties }: { properties: FeaturedProperty[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!registered) {
      gsap.registerPlugin(ScrollTrigger);
      registered = true;
    }
    const container = containerRef.current;
    if (!container) return;

    const cards = container.querySelectorAll("[data-reveal-card]");
    const tween = gsap.from(cards, {
      opacity: 0,
      y: 48,
      duration: 0.7,
      ease: "power2.out",
      stagger: 0.12,
      scrollTrigger: {
        trigger: container,
        start: "top 85%",
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  if (properties.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-12 text-center">
        <p className="text-lg font-medium text-foreground">No featured stays yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          New listings are being reviewed -- check back soon, or explore search to see everything live.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {properties.map((property) => (
        <Link
          key={property.slug}
          href={`/listing/${property.slug}`}
          data-reveal-card
          className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg"
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
            {property.coverImageUrl ? (
              <Image
                src={property.coverImageUrl}
                alt={property.title}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-teal/30 to-brand-gold/30 text-sm text-muted-foreground">
                No photo yet
              </div>
            )}
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-1 font-display text-base font-semibold text-foreground">
                {property.title}
              </h3>
              {property.averageRating > 0 && (
                <span className="flex shrink-0 items-center gap-1 text-sm text-foreground">
                  <Star className="h-3.5 w-3.5 fill-brand-gold text-brand-gold" />
                  {property.averageRating.toFixed(1)}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {[property.city, property.state].filter(Boolean).join(", ") || "Location coming soon"}
            </p>
            <p className="mt-2 text-sm">
              <span className="font-semibold text-foreground">
                {formatCents(property.basePriceCents, property.currency)}
              </span>{" "}
              <span className="text-muted-foreground">/ night</span>
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
