import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] max-w-2xl flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Compass className="h-8 w-8" />
      </div>
      <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-foreground">
        Looks like you&apos;ve wandered off the map
      </h1>
      <p className="mt-3 max-w-md text-foreground/80">
        We couldn&apos;t find the page you were looking for. It may have
        moved, or the link might be out of date.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/search">Explore stays</Link>
        </Button>
      </div>
    </div>
  );
}
