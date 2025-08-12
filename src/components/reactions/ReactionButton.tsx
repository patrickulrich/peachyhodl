import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Heart, Smile } from "lucide-react";
import { useReactions } from "@/hooks/useReactions";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ReactionContent } from "./ReactionContent";
import { cn } from "@/lib/utils";
import type { NostrEvent } from "@nostrify/nostrify";

interface ReactionButtonProps {
  message: NostrEvent;
  className?: string;
}

// Common emojis for reactions (❤️ first as the most common reaction)
const REACTION_EMOJIS = [
  "❤️", "👍", "😂", "😮", "😢", "😡", "👎", "🔥", "💯", "🎉",
  "🍑", "😀", "😊", "😍", "🥰", "😘", "😎", "🤔", "😏", "🙄",
  "😴", "🤓", "😕", "😳", "🥺", "😭", "😱", "😤", "💀", "🤡",
  "👻", "👽", "🤖", "😺", "🧡", "💛", "💚", "💙", "💜", "🖤",
  "💔", "💗", "💖", "👋", "👌", "✌️", "🤞", "🤘", "👏",
  "🙌", "🤝", "🙏", "💪", "✨", "⚡", "🌟", "⭐", "🌈", "☀️",
  "🎊", "🎁", "🎄", "🎃", "✅", "❌", "❓", "❗", "💬", "💭",
  "🚀", "💎", "📺", "🎮", "🎵", "🎶", "📱", "💰", "🤯", "🎯", "🪙"
];

export function ReactionButton({ message, className }: ReactionButtonProps) {
  const { user } = useCurrentUser();
  const { reactionSummary, addReaction, removeReaction, isAddingReaction } = useReactions(message.id);
  const [emojiPopoverOpen, setEmojiPopoverOpen] = useState(false);

  // Show reaction button even when not logged in, but disable interactions
  const isLoggedIn = !!user;

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isLoggedIn) return; // Don't handle interactions when not logged in
    
    e.preventDefault();
    // Always open the emoji selector on click
    setEmojiPopoverOpen(true);
  };

  const handleEmojiSelect = (emoji: string) => {
    if (!isLoggedIn) return; // Don't handle interactions when not logged in
    
    // Check if user already reacted with this emoji
    const existingReaction = reactionSummary.reactions.find(r => 
      r.content === emoji && r.userReacted
    );
    
    if (existingReaction) {
      removeReaction({ targetEvent: message, content: emoji });
    } else {
      addReaction({ targetEvent: message, content: emoji });
    }
    
    setEmojiPopoverOpen(false);
  };

  const totalReactions = reactionSummary.likes + reactionSummary.reactions.reduce((sum, r) => sum + r.count, 0);
  const userHasReacted = reactionSummary.userLiked || reactionSummary.reactions.some(r => r.userReacted);
  
  // Check if user reacted with heart emoji specifically
  const userReactedWithHeart = reactionSummary.reactions.some(r => r.content === "❤️" && r.userReacted);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover open={emojiPopoverOpen && isLoggedIn} onOpenChange={(open) => isLoggedIn && setEmojiPopoverOpen(open)}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-2 text-xs transition-colors",
              userHasReacted && "text-red-500 hover:text-red-600",
              !userHasReacted && "text-muted-foreground hover:text-foreground",
              !isLoggedIn && "opacity-60 cursor-not-allowed"
            )}
            disabled={isAddingReaction || !isLoggedIn}
            onClick={handleClick}
          >
            <Heart className={cn("h-3 w-3 mr-1", (reactionSummary.userLiked || userReactedWithHeart) && "fill-current")} />
            {totalReactions > 0 && (
              <span className="tabular-nums">{totalReactions}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start" side="top">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Smile className="h-4 w-4" />
              React with emoji
            </div>
            <div className="grid grid-cols-10 gap-1">
              {REACTION_EMOJIS.map((emoji) => {
                const userReacted = reactionSummary.reactions.some(r => 
                  r.content === emoji && r.userReacted
                );
                
                return (
                  <button
                    key={emoji}
                    type="button"
                    className={cn(
                      "p-1.5 hover:bg-muted rounded text-lg transition-colors",
                      userReacted && "bg-primary/10 ring-1 ring-primary/20"
                    )}
                    onClick={() => handleEmojiSelect(emoji)}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Show individual emoji reactions */}
      {reactionSummary.reactions.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {reactionSummary.reactions.map((reaction) => {
            // Use the first event with custom emoji tags, or fall back to any event
            const eventWithEmoji = reaction.events.find(e => 
              e.tags.some(tag => tag[0] === 'emoji')
            ) || reaction.events[0];

            return (
              <Button
                key={reaction.content}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 px-1.5 text-xs transition-colors",
                  reaction.userReacted && "bg-primary/10 ring-1 ring-primary/20",
                  !reaction.userReacted && "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => handleEmojiSelect(reaction.content)}
                disabled={isAddingReaction}
              >
                <span className="mr-0.5">
                  <ReactionContent 
                    content={reaction.content}
                    reactionEvent={eventWithEmoji}
                  />
                </span>
                <span className="tabular-nums">{reaction.count}</span>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}