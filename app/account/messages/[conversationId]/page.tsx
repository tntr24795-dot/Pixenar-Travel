import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ThreadView, type ThreadParticipant } from "./thread-view";

export default async function ConversationPage({
  params,
}: {
  params: { conversationId: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/account/messages/${params.conversationId}`);
  }

  // `conversations_participant_all` RLS restricts this to conversations where
  // guest_id or host_id = auth.uid() — a foreign conversation id simply
  // returns no row.
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, guest_id, host_id")
    .eq("id", params.conversationId)
    .maybeSingle();

  if (!conversation) {
    notFound();
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });

  // Mark any messages from the other participant as read now that the
  // thread is open. NOTE: as of 0002_rls.sql, `messages` only has SELECT and
  // INSERT policies for participants — there is no UPDATE policy, so this
  // call currently affects 0 rows under RLS (fails silently, doesn't throw).
  // The read-receipt UX is wired up and ready; making it actually persist
  // requires adding something like:
  //   create policy "messages_update_participant_mark_read" on messages
  //     for update using (exists (select 1 from conversations c where c.id = messages.conversation_id
  //       and (c.guest_id = auth.uid() or c.host_id = auth.uid())))
  //     with check (sender_id <> auth.uid()); -- only mark others' messages read
  // to 0002_rls.sql — a migration change outside this account-section's
  // ownership, left as a follow-up rather than self-served here.
  const unreadIds = (messages ?? [])
    .filter((m) => m.sender_id !== user.id && !m.read_at)
    .map((m) => m.id);

  if (unreadIds.length > 0) {
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
  }

  const participantIds = [conversation.guest_id, conversation.host_id];
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, first_name, last_name, avatar_url")
    .in("id", participantIds);

  const participants: ThreadParticipant[] = (profiles ?? [])
    .filter((p): p is typeof p & { id: string } => !!p.id)
    .map((p) => ({
      id: p.id,
      name: [p.first_name, p.last_name].filter(Boolean).join(" ") || "User",
      avatarUrl: p.avatar_url,
    }));

  return (
    <ThreadView
      conversationId={conversation.id}
      currentUserId={user.id}
      initialMessages={messages ?? []}
      participants={participants}
    />
  );
}
