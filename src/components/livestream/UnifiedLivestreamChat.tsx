import { useEffect, useRef, useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Twitch, Zap, LogOut, LogIn, Gift, Heart, Users, Sparkles, Crown, UserPlus } from "lucide-react";
import { useNostr } from "@nostrify/react";
import { useAuthor } from "@/hooks/useAuthor";
import { genUserName } from "@/lib/genUserName";
import { useTwitchEventSub } from "@/hooks/useTwitchEventSub";
import { useZapNotifications } from "@/hooks/useZapNotifications";
import { useAuthor as useZapAuthor } from "@/hooks/useAuthor";
import { getTwitchAuthUrl, TWITCH_CHANNEL } from "@/lib/twitch";
import { NoteContent } from "@/components/NoteContent";
import { ReactionButton } from "@/components/reactions/ReactionButton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useMessageModeration } from "@/hooks/useMessageModeration";
import { isUserMentioned } from "@/lib/mentions";
import LoginDialog from "@/components/auth/LoginDialog";
import { ZapButton } from "@/components/ZapButton";
import type { NostrEvent } from "@nostrify/nostrify";
import type { TwitchMessage } from "@/lib/twitch";
import { cn } from "@/lib/utils";

const PEACHY_HEX = '0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820';

// Component for parsing URLs and mentions in Twitch messages
function TwitchMessageContent({ content }: { content: string }) {
  const parsedContent = useMemo(() => {
    // Regex to find URLs and @mentions
    const regex = /(https?:\/\/[^\s]+)|(@\w+)/g;
    
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyCounter = 0;
    
    while ((match = regex.exec(content)) !== null) {
      const [fullMatch, url, mention] = match;
      const index = match.index;
      
      // Add text before this match
      if (index > lastIndex) {
        parts.push(content.substring(lastIndex, index));
      }
      
      if (url) {
        // Handle URLs
        parts.push(
          <a 
            key={`url-${keyCounter++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            {url}
          </a>
        );
      } else if (mention) {
        // Handle @mentions
        parts.push(
          <span 
            key={`mention-${keyCounter++}`}
            className="text-purple-400 font-medium"
          >
            {mention}
          </span>
        );
      }
      
      lastIndex = index + fullMatch.length;
    }
    
    // Add any remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }
    
    // If no special content was found, just use the plain text
    if (parts.length === 0) {
      parts.push(content);
    }
    
    return parts;
  }, [content]);

  return <>{parsedContent}</>;
}

// Using NostrEvent directly - no extensions needed for chat messages
type ExtendedNostrEvent = NostrEvent;

type UnifiedMessage = {
  id: string;
  source: 'nostr' | 'twitch' | 'zap';
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
  // Zap-specific fields
  satoshis?: number;
  zapType?: 'profile' | 'stream';
};

interface NostrChatMessageProps {
  message: ExtendedNostrEvent;
  isPeachy?: boolean;
  isNew?: boolean;
}

function NostrChatMessage({ message, isPeachy, isNew }: NostrChatMessageProps) {
  const author = useAuthor(message.pubkey);
  const { user } = useCurrentUser();
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(message.pubkey);
  const { isModerated } = useMessageModeration(message.id);
  const time = new Date(message.created_at * 1000).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Check if current user is mentioned in this message
  const isMentioned = user && isUserMentioned(message, user.pubkey);

  // Don't hide moderated messages in UnifiedLivestreamChat, just grey them out

  return (
    <div 
      className={cn(
        "p-4 rounded-lg border transition-all duration-300 w-full",
        isPeachy && "bg-gradient-to-r from-pink-500/10 to-pink-400/5 border-pink-500/30",
        !isPeachy && !isMentioned && "bg-card hover:bg-accent/5",
        isMentioned && "bg-gradient-to-r from-blue-500/15 to-cyan-500/10 border-blue-500/40 ring-1 ring-blue-500/30",
        isNew && "animate-in slide-in-from-bottom-2",
        isModerated && "opacity-50 bg-muted/30 border-destructive/20"
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className={cn("h-8 w-8 flex-shrink-0", isPeachy && "ring-2 ring-pink-500")}>
          <AvatarImage src={metadata?.picture} alt={displayName} />
          <AvatarFallback>
            {isPeachy ? "🍑" : displayName[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn("font-semibold text-sm truncate", isPeachy && "text-pink-500")}>
              {displayName}
            </span>
            <Badge variant="outline" className="text-xs flex-shrink-0">
              <Zap className="h-3 w-3 mr-1" />
              Nostr
            </Badge>
            <ReactionButton message={message} className="ml-2" />
            <ZapButton target={message} className="ml-2 text-xs" showCount={true} />
            {isPeachy && (
              <Badge variant="default" className="bg-gradient-to-r from-pink-500 to-pink-600 text-white border-0 flex-shrink-0">
                HOST
              </Badge>
            )}
            {isModerated && (
              <Badge variant="destructive" className="text-xs flex-shrink-0">
                MODERATED
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">{time}</span>
          </div>
          <div className="text-sm" style={{ wordWrap: 'break-word', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
            <NoteContent event={message} className="break-words overflow-wrap-anywhere" />
          </div>
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
        "p-4 rounded-lg border transition-all duration-300 w-full",
        isSpecialEvent && `bg-gradient-to-r ${getEventColor()} shadow-lg`,
        isPeachy && !isSpecialEvent && "bg-gradient-to-r from-purple-500/10 to-purple-400/5 border-purple-500/30",
        !isPeachy && !isSpecialEvent && "bg-card hover:bg-accent/5",
        isNew && "animate-in slide-in-from-bottom-2"
      )}
    >
      <div className="flex items-start gap-3">
        {isSpecialEvent ? (
          <div className="h-10 w-10 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg flex-shrink-0">
            {getEventIcon()}
          </div>
        ) : (
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0",
            isPeachy ? "bg-purple-500" : "bg-purple-600"
          )}
          style={{ backgroundColor: message.color || undefined }}>
            {message.displayName[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span 
              className={cn("font-semibold text-sm truncate", isPeachy && "text-purple-500")}
              style={{ color: isSpecialEvent ? undefined : message.color || undefined }}
            >
              {message.displayName}
            </span>
            
            {/* Event-specific badges */}
            {message.messageType === 'subscription' && (
              <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 flex-shrink-0">
                <Crown className="h-3 w-3 mr-1" />
                {message.isResub ? `RESUB x${message.subMonths}` : 'NEW SUB'} {getSubTierLabel(message.subTier)}
              </Badge>
            )}
            
            {message.messageType === 'giftsub' && (
              <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 flex-shrink-0">
                <Gift className="h-3 w-3 mr-1" />
                GIFTED {message.giftTotal && message.giftTotal > 1 ? `${message.giftTotal} SUBS` : 'SUB'}
              </Badge>
            )}
            
            {message.messageType === 'bits' && (
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-500 text-white border-0 flex-shrink-0">
                <Sparkles className="h-3 w-3 mr-1" />
                {message.bits} BITS
              </Badge>
            )}
            
            {message.messageType === 'raid' && (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 flex-shrink-0">
                <Users className="h-3 w-3 mr-1" />
                RAID {message.raidViewers} viewers
              </Badge>
            )}
            
            {message.messageType === 'announcement' && (
              <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 flex-shrink-0">
                ANNOUNCEMENT
              </Badge>
            )}
            
            {message.messageType === 'follow' && (
              <Badge className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white border-0 flex-shrink-0">
                <UserPlus className="h-3 w-3 mr-1" />
                NEW FOLLOWER
              </Badge>
            )}
            
            {/* Regular badges */}
            {!isSpecialEvent && (
              <>
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  <Twitch className="h-3 w-3 mr-1" />
                  Twitch
                </Badge>
                {message.isBroadcaster && (
                  <Badge variant="default" className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 flex-shrink-0">
                    BROADCASTER
                  </Badge>
                )}
                {message.isMod && !message.isBroadcaster && (
                  <Badge variant="secondary" className="flex-shrink-0">MOD</Badge>
                )}
                {message.isVip && (
                  <Badge variant="secondary" className="flex-shrink-0">VIP</Badge>
                )}
                {message.isSubscriber && !message.messageType && (
                  <Badge variant="secondary" className="flex-shrink-0">SUB</Badge>
                )}
              </>
            )}
            
            <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">{time}</span>
          </div>
          
          {/* Message content with special formatting for events */}
          <div>
            {message.messageType === 'giftsub' && message.giftRecipient && (
              <p className="text-sm font-medium mb-1 break-words">
                → Gifted to <span className="text-purple-500">{message.giftRecipient}</span>
              </p>
            )}
            
            {message.messageType === 'raid' && message.raidFromChannel && (
              <p className="text-sm font-medium mb-1 break-words">
                From <span className="text-purple-500">{message.raidFromChannel}</span>
              </p>
            )}
            
            <div 
              className={cn(
                "text-sm break-words overflow-wrap-anywhere whitespace-pre-wrap",
                isSpecialEvent && "font-medium"
              )}
              style={{ wordWrap: 'break-word', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
            >
              <TwitchMessageContent content={message.message} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ZapNotificationMessageProps {
  satoshis: number;
  zapType: 'profile' | 'stream';
  senderPubkey: string;
  message: string;
  isNew?: boolean;
}

function ZapNotificationMessage({ satoshis, zapType, senderPubkey, message, isNew }: ZapNotificationMessageProps) {
  const author = useZapAuthor(senderPubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(senderPubkey);
  
  const zapIcon = zapType === 'profile' ? '👤' : '🎬';
  const zapLabel = zapType === 'profile' ? 'PROFILE ZAP' : 'STREAM ZAP';
  
  return (
    <div 
      className={cn(
        "p-4 rounded-lg border transition-all duration-300 bg-gradient-to-r from-yellow-500/20 to-orange-500/10 border-yellow-500/40 shadow-lg w-full",
        isNew && "animate-in slide-in-from-bottom-2"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-500 to-orange-500 text-white shadow-lg flex-shrink-0">
          <Zap className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-sm text-yellow-600 truncate">
              {displayName}
            </span>
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 flex-shrink-0">
              {zapIcon} {zapLabel}
            </Badge>
            <Badge variant="outline" className="text-xs font-bold text-yellow-600 border-yellow-500 flex-shrink-0">
              ⚡ {satoshis.toLocaleString()} sats
            </Badge>
          </div>
          <div>
            <p className="text-sm font-medium break-words">
              Zapped ⚡ {satoshis.toLocaleString()} sats to {zapType === 'profile' ? "Peachy's profile" : "this stream"}!
            </p>
            {message && (
              <div 
                className="text-sm mt-1 break-words overflow-wrap-anywhere whitespace-pre-wrap italic text-yellow-700"
                style={{ wordWrap: 'break-word', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              >
                "{message}"
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function useLivestreamData() {
  const { nostr } = useNostr();
  const [liveEvent, setLiveEvent] = useState<NostrEvent | null>(null);
  const [messages, setMessages] = useState<ExtendedNostrEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    setIsLoading(true);
    
    // Create real-time subscription using AbortController for cleanup
    const abortController = new AbortController();
    
    // Simple timeout for better UX - don't wait forever for EOSE
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000); // 3 second timeout
    
    const subscribeToLivestream = async () => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const oneDayAgo = now - (24 * 60 * 60);

        // First get live events where Peachy is a participant
        const allEvents = await nostr.query([{
          kinds: [30311],
          limit: 100,
        }], { signal: abortController.signal });

        // Filter for events where Peachy is a participant
        const peachyEvents = allEvents.filter(event => {
          // Check if Peachy's pubkey is in any p tag
          return event.tags.some(tag => 
            tag[0] === 'p' && tag[1] === PEACHY_HEX
          );
        });

        // Find the most recent live event
        const currentLiveEvent = peachyEvents
          .sort((a, b) => b.created_at - a.created_at)[0];
        
        setLiveEvent(currentLiveEvent || null);
        
        // If we have a live event, subscribe to its messages
        if (currentLiveEvent) {
          const dTag = currentLiveEvent.tags.find(([t]) => t === "d")?.[1];
          
          if (dTag) {
            const eventATag = `30311:${currentLiveEvent.pubkey}:${dTag}`;
            
            // Use req() for real-time streaming of messages
            const messageStream = nostr.req([{
              kinds: [1311],
              "#a": [eventATag],
              since: oneDayAgo,
              limit: 200
            }], { signal: abortController.signal });

            for await (const msg of messageStream) {
              if (msg[0] === 'EVENT') {
                const event = msg[2];
                
                // Handle chat messages
                setMessages(prev => {
                  // Check if message already exists to prevent duplicates
                  const exists = prev.some(msg => msg.id === event.id);
                  if (exists) return prev;
                  
                  // Add new message and sort by timestamp, keep last 300
                  const newMessages = [...prev, event]
                    .sort((a, b) => a.created_at - b.created_at)
                    .slice(-300);
                  return newMessages;
                });
              } else if (msg[0] === 'EOSE') {
                clearTimeout(loadingTimeout);
                setIsLoading(false);
              } else if (msg[0] === 'CLOSED') {
                clearTimeout(loadingTimeout);
                break;
              }
            }
          }
        } else {
          // No live event found, stop loading
          clearTimeout(loadingTimeout);
          setIsLoading(false);
        }
      } catch (error) {
        clearTimeout(loadingTimeout);
        if (error.name !== 'AbortError') {
          console.error("Livestream subscription error:", error);
        }
        setIsLoading(false);
      }
    };

    subscribeToLivestream();

    // Cleanup subscription on unmount or dependency change
    return () => {
      clearTimeout(loadingTimeout);
      abortController.abort();
    };
  }, [nostr]);

  return {
    data: {
      liveEvent,
      messages
    },
    isLoading
  };
}

export function UnifiedLivestreamChat() {
  const { data: nostrData, isLoading: isNostrLoading } = useLivestreamData();
  const { 
    messages: twitchMessages, 
    isConnected: isTwitchConnected,
    isAuthenticated: isTwitchAuthenticated,
    error: twitchError,
    clearAuth: clearTwitchAuth
  } = useTwitchEventSub();
  
  const liveEvent = nostrData?.liveEvent;
  const liveEventId = liveEvent?.id;
  const { data: zapNotifications = [] } = useZapNotifications(liveEventId);
  const { user } = useCurrentUser();
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const prevMessagesLength = useRef(0);
  const isAtBottomRef = useRef(true);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const hasInitialScrolled = useRef(false);

  // Merge and sort all messages by timestamp
  const unifiedMessages = useMemo(() => {
    const nostrMessages = nostrData?.messages || [];
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

    // Convert Zap notifications
    zapNotifications.forEach(zap => {
      unified.push({
        id: `zap-${zap.id}`,
        source: 'zap',
        timestamp: zap.timestamp,
        content: zap.message,
        author: {
          name: '', // Will be filled by component
          avatar: undefined
        },
        isPeachy: false, // Zaps are to Peachy, but sent by others
        satoshis: zap.amount,
        zapType: zap.type
      });
    });

    // Sort by timestamp
    return unified.sort((a, b) => a.timestamp - b.timestamp).slice(-500);
  }, [nostrData?.messages, twitchMessages, zapNotifications]);

  // Note: status and title functions removed since we're not displaying them anymore

  // Set up scroll listener to detect when user is at bottom
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;
    
    const handleScroll = () => {
      const threshold = 100; // 100px threshold for "at bottom"
      const isBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - threshold;
      isAtBottomRef.current = isBottom;
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Initial scroll to bottom when messages load
  useEffect(() => {
    if (!hasInitialScrolled.current && unifiedMessages.length > 0) {
      const scrollToBottom = () => {
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
          // Mark user as at bottom after initial scroll
          isAtBottomRef.current = true;
        }
      };

      // Use multiple attempts to ensure scroll happens after render
      requestAnimationFrame(() => {
        scrollToBottom();
        setTimeout(scrollToBottom, 10);
        setTimeout(scrollToBottom, 50);
        setTimeout(scrollToBottom, 100);
      });
      
      hasInitialScrolled.current = true;
    }
  }, [unifiedMessages.length]);

  // Track new messages and auto-scroll when user is at bottom
  useEffect(() => {
    if (unifiedMessages.length > prevMessagesLength.current) {
      const newMessages = unifiedMessages.slice(prevMessagesLength.current);
      setNewMessageIds(prev => {
        const newIds = new Set(prev);
        newMessages.forEach(msg => newIds.add(msg.id));
        return newIds;
      });
      
      // If user is at bottom, keep them there with new messages
      if (isAtBottomRef.current) {
        const scrollToBottom = () => {
          const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }
        };

        // Use RAF to scroll after the new messages render
        requestAnimationFrame(() => {
          scrollToBottom();
          // Additional attempt to handle any delayed rendering
          setTimeout(scrollToBottom, 50);
        });
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

  const handlePeachClick = () => {
    if (!user) {
      setIsLoginDialogOpen(true);
    }
  };

  const handleLoginClose = () => {
    setIsLoginDialogOpen(false);
  };

  const handleLoginSuccess = () => {
    setIsLoginDialogOpen(false);
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b bg-card flex-shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <h1 
                className={cn(
                  "text-2xl font-bold",
                  !user && "cursor-pointer hover:scale-110 transition-transform"
                )}
                onClick={handlePeachClick}
                title={!user ? "Click to login" : "Welcome to Peachy's chat"}
              >
                🍑
              </h1>
              {user && (
                <Badge variant="outline" className="text-xs">
                  Signed in
                </Badge>
              )}
            </div>
            
            {/* Twitch Connection Status */}
            <div className="flex items-center gap-2">
              {isTwitchAuthenticated ? (
                <>
                  <Badge variant={isTwitchConnected ? "default" : "secondary"}>
                    <Twitch className="h-3 w-3 mr-1" />
                    {isTwitchConnected ? 'EventSub Connected' : 'EventSub Connecting...'}
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
                  Connect Twitch Events
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 container mx-auto px-4 py-6 max-w-4xl overflow-hidden">
        <Card className="h-full flex flex-col">
          {twitchError && (
            <div className="p-4 border-b flex-shrink-0">
              <p className="text-sm text-destructive">{twitchError}</p>
            </div>
          )}
          <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full" ref={scrollAreaRef}>
              <div className="p-4 w-full overflow-hidden">
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
                        Connect Twitch to see follows, bits, and subs
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 w-full overflow-hidden">
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
                      } else if (message.source === 'zap' && message.satoshis && message.zapType) {
                        // Extract sender pubkey from zap notification
                        const zapNotification = zapNotifications.find(zap => `zap-${zap.id}` === message.id);
                        const senderPubkey = zapNotification?.sender.pubkey || '';
                        
                        return (
                          <ZapNotificationMessage
                            key={message.id}
                            satoshis={message.satoshis}
                            zapType={message.zapType}
                            senderPubkey={senderPubkey}
                            message={message.content}
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
      
      {/* Login Dialog */}
      <LoginDialog
        isOpen={isLoginDialogOpen}
        onClose={handleLoginClose}
        onLogin={handleLoginSuccess}
      />
    </div>
  );
}