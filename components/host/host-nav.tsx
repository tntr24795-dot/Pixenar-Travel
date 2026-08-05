"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Home,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Wallet,
  Banknote,
  ListChecks,
} from "lucide-react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/host/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/host/listings", label: "Listings", icon: Home },
  { href: "/host/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/host/reservations", label: "Reservations", icon: ListChecks },
  { href: "/host/messages", label: "Messages", icon: MessageSquare },
  { href: "/host/earnings", label: "Earnings", icon: Banknote },
  { href: "/host/payouts", label: "Payouts", icon: Wallet },
  { href: "/host/settings", label: "Settings", icon: Settings },
] as const;

export function HostNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
      {LINKS.map((link) => {
        const isActive = pathname?.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
