import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { useLiveChat } from "@/hooks/useLiveChat";
import { useAuthor } from "@/hooks/useAuthor";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { genUserName } from "@/lib/genUserName";
import type { NostrEvent } from "@nostrify/nostrify";

interface LiveChatProps {
  liveEventId: string | null;
  liveEvent: NostrEvent | null;
}

function ChatMessage({ message, isNew }: { message: NostrEvent, isNew?: boolean }) {
  const author = useAuthor(message.pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(message.pubkey);

  return (
    <div className={`flex gap-3 p-3 hover:bg-muted/50 transition-all duration-300 ${
      isNew ? 'animate-in slide-in-from-bottom-2 bg-primary/5 border-l-2 border-primary' : ''
    }`}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={metadata?.picture} alt={displayName} />
        <AvatarFallback>{displayName[0].toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm">{displayName}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.created_at * 1000).toLocaleTimeString()}
          </span>
        </div>
        <p className="text-sm break-words">{message.content}</p>
      </div>
    </div>
  );
}

export function LiveChat({ liveEventId, liveEvent }: LiveChatProps) {
  const { data: messages = [], isLoading } = useLiveChat(liveEventId);
  const { user } = useCurrentUser();
  const { mutate: publishMessage } = useNostrPublish();
  const [newMessage, setNewMessage] = useState("");
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(messages.length);

  // Track new messages and auto-scroll
  useEffect(() => {
    // Detect new messages
    if (messages.length > prevMessagesLength.current) {
      const newMessages = messages.slice(prevMessagesLength.current);
      setNewMessageIds(prev => {
        const newIds = new Set(prev);
        newMessages.forEach(msg => newIds.add(msg.id));
        return newIds;
      });
      
      // Auto-scroll to bottom
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    }
    
    prevMessagesLength.current = messages.length;
  }, [messages]);

  // Remove new message highlighting after a delay
  useEffect(() => {
    if (newMessageIds.size > 0) {
      const timer = setTimeout(() => {
        setNewMessageIds(new Set());
      }, 3000); // Remove highlighting after 3 seconds
      
      return () => clearTimeout(timer);
    }
  }, [newMessageIds]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !liveEvent || !user) return;

    const aTag = `30311:${liveEvent.pubkey}:${liveEvent.tags.find(([t]) => t === "d")?.[1]}`;
    
    publishMessage({
      kind: 1311,
      content: newMessage.trim(),
      tags: [["a", aTag, "", "root"]],
    });

    setNewMessage("");
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-lg">Live Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <ScrollArea className="flex-1 px-4 min-h-0" ref={scrollAreaRef}>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading chat...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No messages yet. Be the first to chat!
            </div>
          ) : (
            <div className="space-y-1 py-2">
              {messages.map((message) => (
                <ChatMessage 
                  key={message.id} 
                  message={message} 
                  isNew={newMessageIds.has(message.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        
        {user ? (
          <form onSubmit={handleSendMessage} className="p-4 border-t flex-shrink-0">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
                disabled={!liveEvent}
              />
              <Button type="submit" size="icon" disabled={!liveEvent || !newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-4 border-t text-center text-sm text-muted-foreground flex-shrink-0">
            Sign in to participate in chat
          </div>
        )}
      </CardContent>
    </Card>
  );
}