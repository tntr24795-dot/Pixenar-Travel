import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <div className="container py-6">
      <div className="mb-6 h-16 w-full animate-pulse rounded-2xl bg-muted" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr_1fr]">
        <div className="hidden lg:block">
          <Skeleton className="h-[500px] w-full rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
        <div className="hidden lg:block">
          <Skeleton className="h-[600px] w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
