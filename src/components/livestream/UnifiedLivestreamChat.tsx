import { useEffect, useRef, useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Twitch, Zap, LogOut, LogIn } from "lucide-react";
import { useNostr } from "@nostrify/react";
import { useQuery } from "@tanstack/react-query";
import { useAuthor } from "@/hooks/useAuthor";
import { genUserName } from "@/lib/genUserName";
import { useTwitchChat } from "@/hooks/useTwitchChat";
import { getTwitchAuthUrl, TWITCH_CHANNEL } from "@/lib/twitch";
import type { NostrEvent } from "@nostrify/nostrify";
import type { TwitchMessage } from "@/lib/twitch";
import { cn } from "@/lib/utils";

const PEACHY_HEX = '0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820';

interface ExtendedNostrEvent extends NostrEvent {
  isStreamUpdate?: boolean;
}

type UnifiedMessage = {
  id: string;
  source: 'nostr' | 'twitch';
  timestamp: number;
  content: string;
  author: {
    name: string;
    avatar?: string;
    color?: string;
  };
  isPeachy?: boolean;
  isStreamUpdate?: boolean;
  isMod?: boolean;
  isSubscriber?: boolean;
  isVip?: boolean;
  badges?: string[];
  nostrEvent?: ExtendedNostrEvent;
  twitchMessage?: TwitchMessage;
};

interface NostrChatMessageProps {
  message: ExtendedNostrEvent;
  isPeachy?: boolean;
  isStreamUpdate?: boolean;
  isNew?: boolean;
}

function NostrChatMessage({ message, isPeachy, isStreamUpdate, isNew }: NostrChatMessageProps) {
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
            <Badge variant="outline" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              Nostr
            </Badge>
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

interface TwitchChatMessageProps {
  message: TwitchMessage;
  isNew?: boolean;
}

function TwitchChatMessage({ message, isNew }: TwitchChatMessageProps) {
  const time = new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const isPeachy = message.username.toLowerCase() === TWITCH_CHANNEL.toLowerCase() || 
                   message.isBroadcaster;

  return (
    <div 
      className={cn(
        "p-4 rounded-lg border transition-all duration-300",
        isPeachy && "bg-gradient-to-r from-purple-500/10 to-purple-400/5 border-purple-500/30",
        !isPeachy && "bg-card hover:bg-accent/5",
        isNew && "animate-in slide-in-from-bottom-2"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm",
          isPeachy ? "bg-purple-500" : "bg-purple-600"
        )}
        style={{ backgroundColor: message.color || undefined }}>
          {message.displayName[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span 
              className={cn("font-semibold text-sm", isPeachy && "text-purple-500")}
              style={{ color: message.color || undefined }}
            >
              {message.displayName}
            </span>
            <Badge variant="outline" className="text-xs">
              <Twitch className="h-3 w-3 mr-1" />
              Twitch
            </Badge>
            {message.isBroadcaster && (
              <Badge variant="default" className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
                BROADCASTER
              </Badge>
            )}
            {message.isMod && !message.isBroadcaster && (
              <Badge variant="secondary">MOD</Badge>
            )}
            {message.isVip && (
              <Badge variant="secondary">VIP</Badge>
            )}
            {message.isSubscriber && (
              <Badge variant="secondary">SUB</Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">{time}</span>
          </div>
          <p className="text-sm mt-1 break-all whitespace-pre-wrap overflow-wrap-anywhere">
            {message.message}
          </p>
        </div>
      </div>
    </div>
  );
}

function useLivestreamData() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['unified-livestream-chat', PEACHY_HEX],
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

export function UnifiedLivestreamChat() {
  const { data: nostrData, isLoading: isNostrLoading } = useLivestreamData();
  const { 
    messages: twitchMessages, 
    isConnected: isTwitchConnected,
    isAuthenticated: isTwitchAuthenticated,
    error: twitchError,
    clearAuth: clearTwitchAuth
  } = useTwitchChat();
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const prevMessagesLength = useRef(0);

  const nostrMessages = nostrData?.messages || [];
  const liveEvent = nostrData?.liveEvent;

  // Merge and sort all messages by timestamp
  const unifiedMessages = useMemo(() => {
    const unified: UnifiedMessage[] = [];

    // Convert Nostr messages
    nostrMessages.forEach(msg => {
      unified.push({
        id: msg.id,
        source: 'nostr',
        timestamp: msg.created_at * 1000,
        content: msg.content,
        author: {
          name: '', // Will be filled by component
          avatar: undefined
        },
        isPeachy: msg.pubkey === PEACHY_HEX,
        isStreamUpdate: msg.isStreamUpdate,
        nostrEvent: msg
      });
    });

    // Convert Twitch messages
    twitchMessages.forEach(msg => {
      unified.push({
        id: msg.id,
        source: 'twitch',
        timestamp: msg.timestamp,
        content: msg.message,
        author: {
          name: msg.displayName,
          color: msg.color
        },
        isPeachy: msg.isBroadcaster || msg.username.toLowerCase() === TWITCH_CHANNEL.toLowerCase(),
        isMod: msg.isMod,
        isSubscriber: msg.isSubscriber,
        isVip: msg.isVip,
        badges: msg.badges,
        twitchMessage: msg
      });
    });

    // Sort by timestamp
    return unified.sort((a, b) => a.timestamp - b.timestamp).slice(-500);
  }, [nostrMessages, twitchMessages]);

  // Get live event status
  const getEventStatus = () => {
    if (!liveEvent) return null;
    const statusTag = liveEvent.tags.find(([t]) => t === "status");
    return statusTag?.[1] || "unknown";
  };

  const getEventTitle = () => {
    if (!liveEvent) return "Peachy's Live Stream Chat";
    const titleTag = liveEvent.tags.find(([t]) => t === "title");
    return titleTag?.[1] || "Peachy's Live Stream";
  };

  const status = getEventStatus();
  const title = getEventTitle();

  // Track new messages and auto-scroll
  useEffect(() => {
    if (unifiedMessages.length > prevMessagesLength.current) {
      const newMessages = unifiedMessages.slice(prevMessagesLength.current);
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
    
    prevMessagesLength.current = unifiedMessages.length;
  }, [unifiedMessages]);

  // Remove new message highlighting after a delay
  useEffect(() => {
    if (newMessageIds.size > 0) {
      const timer = setTimeout(() => {
        setNewMessageIds(new Set());
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [newMessageIds]);

  const handleTwitchAuth = () => {
    window.location.href = getTwitchAuthUrl();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
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
            
            {/* Twitch Connection Status */}
            <div className="flex items-center gap-2">
              {isTwitchAuthenticated ? (
                <>
                  <Badge variant={isTwitchConnected ? "default" : "secondary"}>
                    <Twitch className="h-3 w-3 mr-1" />
                    {isTwitchConnected ? 'Twitch Connected' : 'Twitch Connecting...'}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearTwitchAuth}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleTwitchAuth}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Connect Twitch Chat
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        <Card className="h-[calc(100vh-8rem)]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Unified Chat</h2>
              <div className="flex gap-2">
                <Badge variant="outline">
                  <Zap className="h-3 w-3 mr-1" />
                  Nostr: {nostrMessages.length}
                </Badge>
                {isTwitchConnected && (
                  <Badge variant="outline">
                    <Twitch className="h-3 w-3 mr-1" />
                    Twitch: {twitchMessages.length}
                  </Badge>
                )}
              </div>
            </div>
            {twitchError && (
              <p className="text-sm text-destructive mt-2">{twitchError}</p>
            )}
          </CardHeader>
          <CardContent className="p-0 h-[calc(100%-4rem)]">
            <ScrollArea className="h-full" ref={scrollAreaRef}>
              <div className="p-4">
                {isNostrLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                    <p>Looking for Peachy's live events... 🍑</p>
                    <p className="text-sm mt-2 opacity-70">
                      Searching across multiple platforms
                    </p>
                  </div>
                ) : unifiedMessages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-lg mb-2">No messages yet</p>
                    <p className="text-sm opacity-70">
                      Waiting for the stream to begin...
                    </p>
                    {!isTwitchAuthenticated && (
                      <Button
                        className="mt-4"
                        variant="secondary"
                        onClick={handleTwitchAuth}
                      >
                        <Twitch className="h-4 w-4 mr-2" />
                        Connect Twitch to see more messages
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {unifiedMessages.map((message) => {
                      if (message.source === 'nostr' && message.nostrEvent) {
                        return (
                          <NostrChatMessage
                            key={message.id}
                            message={message.nostrEvent}
                            isPeachy={message.isPeachy}
                            isStreamUpdate={message.isStreamUpdate}
                            isNew={newMessageIds.has(message.id)}
                          />
                        );
                      } else if (message.source === 'twitch' && message.twitchMessage) {
                        return (
                          <TwitchChatMessage
                            key={message.id}
                            message={message.twitchMessage}
                            isNew={newMessageIds.has(message.id)}
                          />
                        );
                      }
                      return null;
                    })}
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