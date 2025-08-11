import { useEffect, useRef, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Send, Smile, AtSign } from "lucide-react";
import { useLiveChat } from "@/hooks/useLiveChat";
import { useAuthor } from "@/hooks/useAuthor";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { ReactionButton } from "@/components/reactions/ReactionButton";
import { genUserName } from "@/lib/genUserName";
import { nip19 } from "nostr-tools";
import type { NostrEvent } from "@nostrify/nostrify";

interface LiveChatProps {
  liveEventId: string | null;
  liveEvent: NostrEvent | null;
}

function ChatMessage({ message, isNew }: { message: NostrEvent, isNew?: boolean }) {
  const author = useAuthor(message.pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(message.pubkey);
  
  // Parse content for nostr: mentions (similar to NoteContent component)
  const parsedContent = useMemo(() => {
    const content = message.content;
    const parts: React.ReactNode[] = [];
    // Use same regex pattern as NoteContent for consistency
    const regex = /nostr:(npub1|nprofile1)([023456789acdefghjklmnpqrstuvwxyz]+)/g;
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      
      // Add mention as a link
      try {
        const nostrId = `${match[1]}${match[2]}`;
        const decoded = nip19.decode(nostrId);
        
        // Handle different nostr identifier types
        if (decoded.type === 'npub') {
          const pubkey = decoded.data;
          parts.push(
            <MentionLink key={match.index} pubkey={pubkey} />
          );
        } else if (decoded.type === 'nprofile') {
          const profileData = decoded.data;
          parts.push(
            <MentionLink key={match.index} pubkey={profileData.pubkey} />
          );
        } else {
          parts.push(match[0]);
        }
      } catch {
        parts.push(match[0]);
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }
    
    return parts.length > 0 ? parts : content;
  }, [message.content]);

  return (
    <div className={`flex gap-3 p-3 hover:bg-muted/50 transition-all duration-300 w-full ${
      isNew ? 'animate-in slide-in-from-bottom-2 bg-primary/5 border-l-2 border-primary' : ''
    }`}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={metadata?.picture} alt={displayName} />
        <AvatarFallback>{displayName[0].toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-semibold text-sm truncate">{displayName}</span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {new Date(message.created_at * 1000).toLocaleTimeString()}
          </span>
          <div className="ml-auto">
            <ReactionButton message={message} />
          </div>
        </div>
        <div className="text-sm break-words overflow-wrap-anywhere whitespace-pre-wrap" style={{ wordWrap: 'break-word', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
          {parsedContent}
        </div>
      </div>
    </div>
  );
}

// Component to display mention links
function MentionLink({ pubkey }: { pubkey: string }) {
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(pubkey);
  
  return (
    <span className="text-blue-500 font-medium hover:underline cursor-pointer break-words">
      @{displayName}
    </span>
  );
}

// Component for mention suggestions
function MentionSuggestion({ pubkey, onSelect }: { pubkey: string; onSelect: (pubkey: string, name: string) => void }) {
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(pubkey);
  
  return (
    <button
      className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded text-left"
      onClick={() => onSelect(pubkey, displayName)}
    >
      <Avatar className="h-6 w-6">
        <AvatarImage src={metadata?.picture} alt={displayName} />
        <AvatarFallback>{displayName[0].toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium">{displayName}</span>
    </button>
  );
}

// Common emojis for quick selection
const EMOJI_LIST = [
  "🍑", "😀", "😂", "🤣", "😊", "😍", "🥰", "😘", "😉", "😋",
  "😜", "🤪", "🤔", "😏", "🙄", "😬", "😔", "😴", "😎", "🤓",
  "😕", "😮", "😳", "🥺", "😢", "😭", "😱", "😤", "😡", "🤬",
  "💀", "💩", "🤡", "👻", "👽", "🤖", "😺", "❤️", "🧡", "💛",
  "💚", "💙", "💜", "🖤", "🤍", "💔", "💗", "💖", "👋", "👌",
  "✌️", "🤞", "🤘", "👍", "👎", "👏", "🙌", "🤝", "🙏", "💪",
  "🔥", "💯", "✨", "⚡", "🌟", "⭐", "🌈", "☀️", "🎉", "🎊",
  "🎁", "🎄", "🎃", "✅", "❌", "❓", "❗", "💬", "💭",
  "🚀", "💎", "📺", "🎮", "🎵", "🎶", "📱", "💰", "🤯", "🎯", "🪙"
];

interface ChatParticipant {
  pubkey: string;
  name: string;
  picture?: string;
}

export function LiveChat({ liveEventId, liveEvent }: LiveChatProps) {
  const { data: messages = [], isLoading } = useLiveChat(liveEventId);
  const { user } = useCurrentUser();
  const { mutate: publishMessage } = useNostrPublish();
  const [newMessage, setNewMessage] = useState("");
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const [emojiPopoverOpen, setEmojiPopoverOpen] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [_selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevMessagesLength = useRef(messages.length);
  
  // Track participants from messages
  const participants = useMemo(() => {
    const participantMap = new Map<string, ChatParticipant>();
    
    messages.forEach(msg => {
      if (!participantMap.has(msg.pubkey)) {
        participantMap.set(msg.pubkey, {
          pubkey: msg.pubkey,
          name: '', // Will be filled by useAuthor hooks
          picture: undefined
        });
      }
    });
    
    return Array.from(participantMap.values());
  }, [messages]);

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

  // Handle input changes and detect @ mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    // Check for @ mention at cursor position
    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Check if we're in a mention (no space after @)
      if (!textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt.toLowerCase());
        setShowMentions(true);
        setSelectedMentionIndex(0);
        return;
      }
    }
    
    setShowMentions(false);
    setMentionSearch("");
  };
  
  // Filter participants based on search
  const filteredParticipants = useMemo(() => {
    if (!mentionSearch) return participants.slice(0, 5);
    
    // We'll filter by name in the MentionSuggestion component
    // For now, just limit the list
    return participants.slice(0, 5);
  }, [participants, mentionSearch]);
  
  // Handle mention selection
  const handleMentionSelect = (pubkey: string, name: string) => {
    const cursorPos = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = newMessage.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textBeforeAt = newMessage.slice(0, lastAtIndex);
      const textAfterCursor = newMessage.slice(cursorPos);
      
      // Replace with @name but store pubkey for later
      const newText = `${textBeforeAt}@${name} ${textAfterCursor}`;
      setNewMessage(newText);
      
      // Store the mention for later processing
      if (!inputRef.current) return;
      inputRef.current.dataset.mentions = JSON.stringify({
        ...(inputRef.current.dataset.mentions ? JSON.parse(inputRef.current.dataset.mentions) : {}),
        [name]: pubkey
      });
    }
    
    setShowMentions(false);
    setMentionSearch("");
    inputRef.current?.focus();
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !liveEvent || !user) return;

    const aTag = `30311:${liveEvent.pubkey}:${liveEvent.tags.find(([t]) => t === "d")?.[1]}`;
    const tags: string[][] = [["a", aTag, "", "root"]];
    
    // Process mentions and add p tags
    const mentions = inputRef.current?.dataset.mentions ? JSON.parse(inputRef.current.dataset.mentions) : {};
    let processedContent = newMessage.trim();
    
    Object.entries(mentions).forEach(([name, pubkey]) => {
      // Add p tag for each mention
      tags.push(["p", pubkey as string]);
      // Replace @name with nostr:npub in content
      const npub = nip19.npubEncode(pubkey as string);
      processedContent = processedContent.replace(new RegExp(`@${name}`, 'g'), `nostr:${npub}`);
    });
    
    publishMessage({
      kind: 1311,
      content: processedContent,
      tags,
    });

    setNewMessage("");
    setEmojiPopoverOpen(false);
    setShowMentions(false);
    // Clear stored mentions
    if (inputRef.current) {
      inputRef.current.dataset.mentions = "";
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-lg">Live Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 min-h-0 overflow-hidden">
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
            <div className="space-y-1 py-2 w-full overflow-hidden">
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
          <form onSubmit={handleSendMessage} className="p-4 border-t flex-shrink-0 relative">
            {/* Mention suggestions dropdown */}
            {showMentions && filteredParticipants.length > 0 && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-popover border rounded-lg shadow-lg p-2 max-h-48 overflow-y-auto">
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <AtSign className="h-3 w-3" />
                  Mention a participant
                </div>
                {filteredParticipants.map((participant) => (
                  <MentionSuggestion
                    key={participant.pubkey}
                    pubkey={participant.pubkey}
                    onSelect={handleMentionSelect}
                  />
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Type a message... (use @ to mention)"
                className="flex-1"
                disabled={!liveEvent}
                onKeyDown={(e) => {
                  if (showMentions && e.key === 'Escape') {
                    setShowMentions(false);
                    setMentionSearch("");
                  }
                }}
              />
              <Popover open={emojiPopoverOpen} onOpenChange={setEmojiPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="ghost"
                    disabled={!liveEvent}
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-2" align="end">
                  <div className="grid grid-cols-10 gap-1">
                    {EMOJI_LIST.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="p-1 hover:bg-muted rounded text-lg transition-colors"
                        onClick={() => {
                          setNewMessage(prev => prev + emoji);
                          setEmojiPopoverOpen(false);
                          inputRef.current?.focus();
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
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