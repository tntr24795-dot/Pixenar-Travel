import { MessageCircle } from "lucide-react";

export default function MessagesEmptyPage() {
  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
      <MessageCircle className="h-8 w-8" />
      <p>Select a conversation to view messages.</p>
    </div>
  );
}
