import { useEffect, useRef, useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Twitch, Zap, LogOut, LogIn, Gift, Heart, Users, Sparkles, Crown, UserPlus } from "lucide-react";
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

// Using NostrEvent directly - no extensions needed for chat messages
type ExtendedNostrEvent = NostrEvent;

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
  isNew?: boolean;
}

function NostrChatMessage({ message, isPeachy, isNew }: NostrChatMessageProps) {
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
        !isPeachy && "bg-card hover:bg-accent/5",
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

  // Special event styling
  const isSpecialEvent = message.messageType && message.messageType !== 'chat';
  
  const getEventIcon = () => {
    switch (message.messageType) {
      case 'subscription': return <Crown className="h-5 w-5" />;
      case 'giftsub': return <Gift className="h-5 w-5" />;
      case 'bits': return <Sparkles className="h-5 w-5" />;
      case 'raid': return <Users className="h-5 w-5" />;
      case 'announcement': return <Heart className="h-5 w-5" />;
      case 'follow': return <UserPlus className="h-5 w-5" />;
      default: return null;
    }
  };

  const getEventColor = () => {
    switch (message.messageType) {
      case 'subscription': return 'from-yellow-500/20 to-amber-500/10 border-yellow-500/40';
      case 'giftsub': return 'from-blue-500/20 to-cyan-500/10 border-blue-500/40';
      case 'bits': return 'from-purple-600/20 to-pink-500/10 border-purple-500/40';
      case 'raid': return 'from-green-500/20 to-emerald-500/10 border-green-500/40';
      case 'announcement': return 'from-red-500/20 to-pink-500/10 border-red-500/40';
      case 'follow': return 'from-indigo-500/20 to-blue-500/10 border-indigo-500/40';
      default: return '';
    }
  };

  const getSubTierLabel = (tier?: string) => {
    switch (tier) {
      case '1000': return 'Tier 1';
      case '2000': return 'Tier 2';
      case '3000': return 'Tier 3';
      case 'Prime': return 'Prime';
      default: return '';
    }
  };

  return (
    <div 
      className={cn(
        "p-4 rounded-lg border transition-all duration-300",
        isSpecialEvent && `bg-gradient-to-r ${getEventColor()} shadow-lg`,
        isPeachy && !isSpecialEvent && "bg-gradient-to-r from-purple-500/10 to-purple-400/5 border-purple-500/30",
        !isPeachy && !isSpecialEvent && "bg-card hover:bg-accent/5",
        isNew && "animate-in slide-in-from-bottom-2"
      )}
    >
      <div className="flex items-start gap-3">
        {isSpecialEvent ? (
          <div className="h-10 w-10 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg">
            {getEventIcon()}
          </div>
        ) : (
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm",
            isPeachy ? "bg-purple-500" : "bg-purple-600"
          )}
          style={{ backgroundColor: message.color || undefined }}>
            {message.displayName[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span 
              className={cn("font-semibold text-sm", isPeachy && "text-purple-500")}
              style={{ color: isSpecialEvent ? undefined : message.color || undefined }}
            >
              {message.displayName}
            </span>
            
            {/* Event-specific badges */}
            {message.messageType === 'subscription' && (
              <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0">
                <Crown className="h-3 w-3 mr-1" />
                {message.isResub ? `RESUB x${message.subMonths}` : 'NEW SUB'} {getSubTierLabel(message.subTier)}
              </Badge>
            )}
            
            {message.messageType === 'giftsub' && (
              <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
                <Gift className="h-3 w-3 mr-1" />
                GIFTED {message.giftTotal && message.giftTotal > 1 ? `${message.giftTotal} SUBS` : 'SUB'}
              </Badge>
            )}
            
            {message.messageType === 'bits' && (
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-500 text-white border-0">
                <Sparkles className="h-3 w-3 mr-1" />
                {message.bits} BITS
              </Badge>
            )}
            
            {message.messageType === 'raid' && (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                <Users className="h-3 w-3 mr-1" />
                RAID {message.raidViewers} viewers
              </Badge>
            )}
            
            {message.messageType === 'announcement' && (
              <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0">
                ANNOUNCEMENT
              </Badge>
            )}
            
            {message.messageType === 'follow' && (
              <Badge className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white border-0">
                <UserPlus className="h-3 w-3 mr-1" />
                NEW FOLLOWER
              </Badge>
            )}
            
            {/* Regular badges */}
            {!isSpecialEvent && (
              <>
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
                {message.isSubscriber && !message.messageType && (
                  <Badge variant="secondary">SUB</Badge>
                )}
              </>
            )}
            
            <span className="text-xs text-muted-foreground ml-auto">{time}</span>
          </div>
          
          {/* Message content with special formatting for events */}
          <div className="mt-1">
            {message.messageType === 'giftsub' && message.giftRecipient && (
              <p className="text-sm font-medium mb-1">
                → Gifted to <span className="text-purple-500">{message.giftRecipient}</span>
              </p>
            )}
            
            {message.messageType === 'raid' && message.raidFromChannel && (
              <p className="text-sm font-medium mb-1">
                From <span className="text-purple-500">{message.raidFromChannel}</span>
              </p>
            )}
            
            <p className={cn(
              "text-sm break-all whitespace-pre-wrap overflow-wrap-anywhere",
              isSpecialEvent && "font-medium"
            )}>
              {message.message}
            </p>
          </div>
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

      // Get live events where Peachy is a participant (same as homepage)
      const allEvents = await nostr.query([{
        kinds: [30311],
        limit: 100,
      }], { signal });

      // Filter for events where Peachy is a participant
      const peachyEvents = allEvents.filter(event => {
        // Check if Peachy's pubkey is in any p tag
        return event.tags.some(tag => 
          tag[0] === 'p' && tag[1] === PEACHY_HEX
        );
      });


      // Find the most recent live event (same as homepage logic)
      const liveEvent = peachyEvents
        .sort((a, b) => b.created_at - a.created_at)[0];
      
      // Get chat messages for that specific live event (like homepage)
      let allMessages: ExtendedNostrEvent[] = [];
      
      if (liveEvent) {
        const dTag = liveEvent.tags.find(([t]) => t === "d")?.[1];
        
        if (dTag) {
          const eventATag = `30311:${liveEvent.pubkey}:${dTag}`;
          
          // Query messages directly with #a filter (same as homepage)
          const chatMessages = await nostr.query([{
            kinds: [1311],
            "#a": [eventATag],
            since: oneDayAgo,
            limit: 200
          }], { signal });
          
          allMessages = chatMessages
            .sort((a, b) => a.created_at - b.created_at)
            .slice(-300); // Keep last 300 messages
        }
      }

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

    // Convert Nostr messages (only kind 1311 chat messages)
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
    if (!liveEvent) return "Peachy's Chat";
    const titleTag = liveEvent.tags.find(([t]) => t === "title");
    return titleTag?.[1] || "Peachy's Chat";
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
          {twitchError && (
            <div className="p-4 border-b">
              <p className="text-sm text-destructive">{twitchError}</p>
            </div>
          )}
          <CardContent className="p-0 h-full">
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