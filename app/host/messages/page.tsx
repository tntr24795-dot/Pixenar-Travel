import Link from "next/link";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { MessageComposer } from "@/components/host/message-composer";

export const metadata = {
  title: "Messages — Pixenar Travel Host",
};

export default async function HostMessagesPage({
  searchParams,
}: {
  searchParams: { conversation?: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/host/messages");
  }

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, guest_id, listing_id, updated_at")
    .eq("host_id", user.id)
    .order("updated_at", { ascending: false });

  const activeConversationId = searchParams.conversation ?? conversations?.[0]?.id;

  const [guestNames, listingTitles, lastMessages] = await Promise.all([
    loadGuestNames(supabase, conversations ?? []),
    loadListingTitles(supabase, conversations ?? []),
    loadLastMessages(supabase, conversations ?? []),
  ]);

  const activeMessages = activeConversationId
    ? (
        await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", activeConversationId)
          .order("created_at", { ascending: true })
      ).data
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Messages</h1>
        <p className="mt-1 text-muted-foreground">Conversations with your guests.</p>
      </div>

      {!conversations || conversations.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No conversations yet — they'll show up here once a guest messages you.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 overflow-hidden rounded-lg border border-border md:grid-cols-[300px_1fr]">
          <div className="max-h-[70vh] divide-y divide-border overflow-y-auto border-b border-border md:border-b-0 md:border-r">
            {conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/host/messages?conversation=${conversation.id}`}
                className={cn(
                  "block p-4 text-sm hover:bg-accent",
                  conversation.id === activeConversationId && "bg-accent"
                )}
              >
                <p className="font-medium">{guestNames[conversation.guest_id] ?? "Guest"}</p>
                <p className="text-xs text-muted-foreground">
                  {listingTitles[conversation.listing_id] ?? "Listing"}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {lastMessages[conversation.id] ?? "No messages yet"}
                </p>
              </Link>
            ))}
          </div>

          <div className="flex max-h-[70vh] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {(activeMessages ?? []).map((message) => {
                const isMine = message.sender_id === user.id;
                return (
                  <div
                    key={message.id}
                    className={cn("flex", isMine ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                        isMine ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}
                    >
                      {message.body}
                    </div>
                  </div>
                );
              })}
              {(!activeMessages || activeMessages.length === 0) && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No messages in this conversation yet.
                </p>
              )}
            </div>
            {activeConversationId && <MessageComposer conversationId={activeConversationId} />}
          </div>
        </div>
      )}
    </div>
  );
}

type SupabaseServer = ReturnType<typeof createClient>;

async function loadGuestNames(
  supabase: SupabaseServer,
  conversations: { guest_id: string }[]
): Promise<Record<string, string>> {
  const ids = Array.from(new Set(conversations.map((c) => c.guest_id)));
  if (ids.length === 0) return {};
  const { data } = await supabase.from("public_profiles").select("id, first_name, last_name").in("id", ids);
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.id as string] = [row.first_name, row.last_name].filter(Boolean).join(" ") || "Guest";
  }
  return map;
}

async function loadListingTitles(
  supabase: SupabaseServer,
  conversations: { listing_id: string }[]
): Promise<Record<string, string>> {
  const ids = Array.from(new Set(conversations.map((c) => c.listing_id)));
  if (ids.length === 0) return {};
  const { data } = await supabase.from("listings").select("id, title").in("id", ids);
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.id] = row.title;
  }
  return map;
}

async function loadLastMessages(
  supabase: SupabaseServer,
  conversations: { id: string }[]
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  await Promise.all(
    conversations.map(async (conversation) => {
      const { data } = await supabase
        .from("messages")
        .select("body")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) map[conversation.id] = data.body;
    })
  );
  return map;
}
