import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useNostr } from "@nostrify/react";
import { useQuery } from "@tanstack/react-query";
import { useAuthor } from "@/hooks/useAuthor";
import { genUserName } from "@/lib/genUserName";
import type { NostrEvent } from "@nostrify/nostrify";
import { cn } from "@/lib/utils";

const PEACHY_HEX = '0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820';

interface ExtendedNostrEvent extends NostrEvent {
  isStreamUpdate?: boolean;
}

interface ChatMessageProps {
  message: ExtendedNostrEvent;
  isPeachy?: boolean;
  isStreamUpdate?: boolean;
  isNew?: boolean;
}

function ChatMessage({ message, isPeachy, isStreamUpdate, isNew }: ChatMessageProps) {
  const author = useAuthor(message.pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(message.pubkey);
  const time = new Date(message.created_at * 1000).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div 
      className={cn(
        "p-4 rounded-lg border transition-all duration-300",
        isPeachy && "bg-gradient-to-r from-pink-500/10 to-pink-400/5 border-pink-500/30",
        isStreamUpdate && "bg-gradient-to-r from-green-500/10 to-emerald-400/5 border-green-500/30",
        !isPeachy && !isStreamUpdate && "bg-card hover:bg-accent/5",
        isNew && "animate-in slide-in-from-bottom-2"
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className={cn("h-8 w-8", isPeachy && "ring-2 ring-pink-500")}>
          <AvatarImage src={metadata?.picture} alt={displayName} />
          <AvatarFallback>
            {isPeachy ? "🍑" : displayName[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("font-semibold text-sm", isPeachy && "text-pink-500")}>
              {displayName}
            </span>
            {isPeachy && (
              <Badge variant="default" className="bg-gradient-to-r from-pink-500 to-pink-600 text-white border-0">
                HOST
              </Badge>
            )}
            {isStreamUpdate && (
              <Badge variant="default" className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
                UPDATE
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">{time}</span>
          </div>
          <p className="text-sm mt-1 break-all whitespace-pre-wrap overflow-wrap-anywhere">
            {message.content}
          </p>
        </div>
      </div>
    </div>
  );
}

function useLivestreamData() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['livestream-chat', PEACHY_HEX],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - (24 * 60 * 60);

      // Fetch live events and recent messages
      const [liveEvents, chatMessages, streamUpdates] = await Promise.all([
        // Get Peachy's live events (kind 30311)
        nostr.query([{ 
          kinds: [30311], 
          authors: [PEACHY_HEX],
          since: oneDayAgo
        }], { signal }),
        
        // Get chat messages (kind 1311)
        nostr.query([{ 
          kinds: [1311],
          since: oneDayAgo,
          limit: 200
        }], { signal }),
        
        // Get Peachy's regular notes as stream updates (kind 1)
        nostr.query([{ 
          kinds: [1], 
          authors: [PEACHY_HEX],
          since: oneDayAgo,
          limit: 20
        }], { signal })
      ]);

      // Find the most recent live event
      const liveEvent = liveEvents.sort((a, b) => b.created_at - a.created_at)[0];
      
      let relevantMessages = chatMessages;
      
      // If we have a live event, filter messages that belong to it
      if (liveEvent) {
        const dTag = liveEvent.tags.find(([t]) => t === "d")?.[1];
        if (dTag) {
          const eventATag = `30311:${liveEvent.pubkey}:${dTag}`;
          relevantMessages = chatMessages.filter(msg => {
            const aTags = msg.tags.filter(([t]) => t === 'a');
            return aTags.some(tag => tag[1] === eventATag);
          });
        }
      }

      // Mark stream updates
      const updatesWithFlag: ExtendedNostrEvent[] = streamUpdates.map(update => ({
        ...update,
        isStreamUpdate: true
      }));

      // Combine and sort all messages
      const allMessages: ExtendedNostrEvent[] = [...relevantMessages, ...updatesWithFlag]
        .sort((a, b) => a.created_at - b.created_at)
        .slice(-300); // Keep last 300 messages

      return {
        liveEvent,
        messages: allMessages
      };
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });
}

export function LivestreamChat() {
  const { data, isLoading } = useLivestreamData();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const prevMessagesLength = useRef(0);

  const messages = data?.messages || [];
  const liveEvent = data?.liveEvent;

  // Get live event status
  const getEventStatus = () => {
    if (!liveEvent) return null;
    const statusTag = liveEvent.tags.find(([t]) => t === "status");
    return statusTag?.[1] || "unknown";
  };

  const getEventTitle = () => {
    if (!liveEvent) return "Peachy's Chat";
    const titleTag = liveEvent.tags.find(([t]) => t === "title");
    return titleTag?.[1] || "Peachy's Chat";
  };

  const status = getEventStatus();
  const title = getEventTitle();

  // Track new messages and auto-scroll
  useEffect(() => {
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
          setTimeout(() => {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }, 100);
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
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [newMessageIds]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-yellow-500 bg-clip-text text-transparent">
                🍑 {title}
              </h1>
              {status === "live" && (
                <Badge variant="destructive" className="animate-pulse">
                  <span className="mr-1">●</span> LIVE
                </Badge>
              )}
              {status === "planned" && (
                <Badge variant="secondary">Scheduled</Badge>
              )}
              {status === "ended" && (
                <Badge variant="outline">Ended</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        <Card className="h-[calc(100vh-8rem)]">
          <CardContent className="p-0 h-full">
            <ScrollArea className="h-full" ref={scrollAreaRef}>
              <div className="p-4">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                    <p>Looking for Peachy's live events... 🍑</p>
                    <p className="text-sm mt-2 opacity-70">
                      Searching across multiple Nostr relays
                    </p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-lg mb-2">No messages yet</p>
                    <p className="text-sm opacity-70">
                      Waiting for the stream to begin...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message) => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        isPeachy={message.pubkey === PEACHY_HEX}
                        isStreamUpdate={message.isStreamUpdate}
                        isNew={newMessageIds.has(message.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}