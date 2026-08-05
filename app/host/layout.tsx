import { HostNav } from "@/components/host/host-nav";

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container py-6">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <HostNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
