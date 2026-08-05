"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Luggage,
  Heart,
  MessageCircle,
  Bell,
  CreditCard,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const NAV_ITEMS = [
  { href: "/account/profile", label: "Profile", icon: User },
  { href: "/account/trips", label: "Trips", icon: Luggage },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/messages", label: "Messages", icon: MessageCircle },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/account/payment-methods", label: "Payment methods", icon: CreditCard },
  { href: "/account/settings", label: "Settings", icon: Settings },
] as const;

interface AccountSidebarProps {
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

export function AccountSidebar({ displayName, email, avatarUrl }: AccountSidebarProps) {
  const pathname = usePathname();
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <nav className="flex flex-col gap-4">
      <div className="flex items-center gap-3 px-2 py-1">
        <Avatar className="h-11 w-11">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
          <AvatarFallback>{initials || "?"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
      </div>

      <ul className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="shrink-0 md:shrink">
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
