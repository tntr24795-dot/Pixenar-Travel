import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ConversationList, type ConversationListItem } from "./_components/conversation-list";

/**
 * Two-pane inbox: this layout renders the conversation list sidebar and
 * `children` (either the empty-state `page.tsx` or a `[conversationId]/page.tsx`
 * thread) as the main panel.
 */
export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/account/messages");
  }

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, guest_id, host_id, listing_id, updated_at")
    .or(`guest_id.eq.${user.id},host_id.eq.${user.id}`)
    .order("updated_at", { ascending: false });

  const conversationIds = (conversations ?? []).map((c) => c.id);
  const listingIds = Array.from(new Set((conversations ?? []).map((c) => c.listing_id)));
  const otherUserIds = Array.from(
    new Set(
      (conversations ?? []).map((c) => (c.guest_id === user.id ? c.host_id : c.guest_id))
    )
  );

  const [{ data: messages }, { data: listings }, { data: profiles }] = await Promise.all([
    conversationIds.length
      ? supabase
          .from("messages")
          .select("conversation_id, body, created_at, sender_id, read_at")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { conversation_id: string; body: string; created_at: string; sender_id: string; read_at: string | null }[] }),
    listingIds.length
      ? supabase.from("listings").select("id, title").in("id", listingIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    otherUserIds.length
      ? supabase.from("public_profiles").select("id, first_name, last_name, avatar_url").in("id", otherUserIds)
      : Promise.resolve({ data: [] as { id: string; first_name: string | null; last_name: string | null; avatar_url: string | null }[] }),
  ]);

  const listingTitleById = new Map((listings ?? []).map((l) => [l.id, l.title]));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const lastMessageByConversation = new Map<string, { body: string; created_at: string }>();
  const unreadCountByConversation = new Map<string, number>();
  for (const msg of messages ?? []) {
    if (!lastMessageByConversation.has(msg.conversation_id)) {
      lastMessageByConversation.set(msg.conversation_id, { body: msg.body, created_at: msg.created_at });
    }
    if (msg.sender_id !== user.id && !msg.read_at) {
      unreadCountByConversation.set(
        msg.conversation_id,
        (unreadCountByConversation.get(msg.conversation_id) ?? 0) + 1
      );
    }
  }

  const items: ConversationListItem[] = (conversations ?? []).map((c) => {
    const otherId = c.guest_id === user.id ? c.host_id : c.guest_id;
    const otherProfile = profileById.get(otherId);
    const otherName =
      [otherProfile?.first_name, otherProfile?.last_name].filter(Boolean).join(" ") || "User";
    const lastMessage = lastMessageByConversation.get(c.id);

    return {
      id: c.id,
      listingTitle: listingTitleById.get(c.listing_id) ?? null,
      otherName,
      otherAvatar: otherProfile?.avatar_url ?? null,
      lastMessageBody: lastMessage?.body ?? null,
      lastMessageAt: lastMessage?.created_at ?? null,
      unreadCount: unreadCountByConversation.get(c.id) ?? 0,
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Messages</h1>
        <p className="text-muted-foreground">Conversations with your hosts.</p>
      </div>
      <div className="grid overflow-hidden rounded-lg border border-border md:grid-cols-[320px_1fr]">
        <div className="max-h-[70vh] overflow-y-auto border-b border-border md:border-b-0 md:border-r">
          <ConversationList conversations={items} />
        </div>
        <div className="min-h-[50vh]">{children}</div>
      </div>
    </div>
  );
}
