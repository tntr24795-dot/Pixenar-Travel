"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function SearchError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
        <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-secondary text-primary">
          <AlertCircle className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="font-display text-2xl font-semibold">We couldn't load these stays</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Please try again. Your search details are still safe.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
