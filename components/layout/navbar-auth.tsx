"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LogOut,
  MessagesSquare,
  Heart,
  LayoutDashboard,
  ShieldCheck,
  Briefcase,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarUser {
  email: string;
  firstName: string | null;
  role: string;
  isHost: boolean;
}

export function NavbarAuth({
  user,
  mobile = false,
}: {
  user: NavbarUser | null;
  mobile?: boolean;
}) {
  const router = useRouter();

  async function handleLogOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!user) {
    return (
      <div
        className={
          mobile
            ? "flex flex-col gap-3"
            : "flex items-center gap-3"
        }
      >
        <Button asChild variant="ghost" size={mobile ? "default" : "sm"}>
          <Link href="/login">Log in</Link>
        </Button>
        <Button asChild size={mobile ? "default" : "sm"}>
          <Link href="/signup">Sign up</Link>
        </Button>
        <Button
          asChild
          variant="link"
          size={mobile ? "default" : "sm"}
          className="text-accent-foreground"
        >
          <Link href="/become-a-host">Become a host</Link>
        </Button>
      </div>
    );
  }

  const initials =
    (user.firstName?.[0] ?? user.email[0] ?? "H").toUpperCase();

  if (mobile) {
    return (
      <div className="flex flex-col gap-3">
        <Link href="/account/trips" className="text-base font-medium">
          Trips
        </Link>
        <Link href="/account/wishlist" className="text-base font-medium">
          Wishlist
        </Link>
        <Link href="/account/messages" className="text-base font-medium">
          Messages
        </Link>
        {user.isHost && (
          <Link href="/host" className="text-base font-medium">
            Host dashboard
          </Link>
        )}
        {user.role === "admin" && (
          <Link href="/admin" className="text-base font-medium">
            Admin
          </Link>
        )}
        <button
          onClick={handleLogOut}
          className="text-left text-base font-medium text-destructive"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          {user.firstName ? `Hi, ${user.firstName}` : user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account/trips" className="cursor-pointer">
            <Briefcase className="mr-2 h-4 w-4" />
            Trips
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/wishlist" className="cursor-pointer">
            <Heart className="mr-2 h-4 w-4" />
            Wishlist
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/messages" className="cursor-pointer">
            <MessagesSquare className="mr-2 h-4 w-4" />
            Messages
          </Link>
        </DropdownMenuItem>
        {user.isHost && (
          <DropdownMenuItem asChild>
            <Link href="/host" className="cursor-pointer">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Host dashboard
            </Link>
          </DropdownMenuItem>
        )}
        {user.role === "admin" && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="cursor-pointer">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Admin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogOut} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
