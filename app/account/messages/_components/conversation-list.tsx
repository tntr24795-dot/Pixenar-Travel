"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ConversationListItem {
  id: string;
  listingTitle: string | null;
  otherName: string;
  otherAvatar: string | null;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export function ConversationList({ conversations }: { conversations: ConversationListItem[] }) {
  const pathname = usePathname();

  if (conversations.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        No conversations yet. Messages with hosts will show up here.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {conversations.map((conversation) => {
        const href = `/account/messages/${conversation.id}`;
        const isActive = pathname === href;
        return (
          <li key={conversation.id}>
            <Link
              href={href}
              className={cn(
                "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-secondary/60",
                isActive && "bg-secondary"
              )}
            >
              <Avatar className="h-9 w-9 shrink-0">
                {conversation.otherAvatar && (
                  <AvatarImage src={conversation.otherAvatar} alt={conversation.otherName} />
                )}
                <AvatarFallback>{conversation.otherName[0] ?? "?"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{conversation.otherName}</p>
                  {conversation.lastMessageAt && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(conversation.lastMessageAt), {
                        addSuffix: false,
                      })}
                    </span>
                  )}
                </div>
                {conversation.listingTitle && (
                  <p className="truncate text-xs text-muted-foreground">{conversation.listingTitle}</p>
                )}
                <p
                  className={cn(
                    "truncate text-sm",
                    conversation.unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {conversation.lastMessageBody ?? "No messages yet"}
                </p>
              </div>
              {conversation.unreadCount > 0 && (
                <Badge className="shrink-0">{conversation.unreadCount}</Badge>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
