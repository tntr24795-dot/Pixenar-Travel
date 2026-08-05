"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Send } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

type Message = Tables<"messages">;

export interface ThreadParticipant {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface ThreadViewProps {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
  participants: ThreadParticipant[];
}

export function ThreadView({
  conversationId,
  currentUserId,
  initialMessages,
  participants,
}: ThreadViewProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const participantById = new Map(participants.map((p) => [p.id, p]));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Live-append new incoming messages via Supabase Realtime (postgres_changes
  // on the `messages` table, filtered to this conversation). Falls back
  // gracefully to whatever was loaded server-side if Realtime is unavailable
  // for this project — the compose box still works via plain inserts either way.
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });

          if (newMessage.sender_id !== currentUserId) {
            // Best-effort read receipt — see the comment in
            // `[conversationId]/page.tsx` about the missing `messages`
            // UPDATE policy; this currently no-ops under RLS until that
            // policy is added.
            supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", newMessage.id)
              .then(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  async function handleSend() {
    const body = draft.trim();
    if (!body) return;

    setIsSending(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: currentUserId, body })
        .select()
        .single();

      if (error) throw error;

      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
      setDraft("");
    } catch (err) {
      toast({
        title: "Couldn't send message",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message) => {
          const isOwn = message.sender_id === currentUserId;
          const sender = participantById.get(message.sender_id);
          return (
            <div
              key={message.id}
              className={cn("flex items-end gap-2", isOwn ? "flex-row-reverse" : "flex-row")}
            >
              <Avatar className="h-7 w-7 shrink-0">
                {sender?.avatarUrl && <AvatarImage src={sender.avatarUrl} alt={sender.name} />}
                <AvatarFallback>{sender?.name?.[0] ?? "?"}</AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                  isOwn ? "bg-primary text-primary-foreground" : "bg-secondary"
                )}
              >
                <p className="whitespace-pre-wrap">{message.body}</p>
                <p
                  className={cn(
                    "mt-1 text-[10px] opacity-70",
                    isOwn ? "text-right" : "text-left"
                  )}
                >
                  {format(new Date(message.created_at), "MMM d, h:mm a")}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-border p-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Write a message…"
          rows={2}
          className="resize-none"
        />
        <Button type="button" onClick={handleSend} disabled={isSending || !draft.trim()} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
