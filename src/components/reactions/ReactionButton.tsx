import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Heart, Smile } from "lucide-react";
import { useReactions } from "@/hooks/useReactions";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";
import type { NostrEvent } from "@nostrify/nostrify";

interface ReactionButtonProps {
  message: NostrEvent;
  className?: string;
}

// Common emojis for reactions
const REACTION_EMOJIS = [
  "❤️", "😂", "😮", "😢", "😡", "👍", "👎", "🔥", "💯", "🎉",
  "🍑", "😀", "😊", "😍", "🥰", "😘", "😎", "🤔", "😏", "🙄",
  "😴", "🤓", "😕", "😳", "🥺", "😭", "😱", "😤", "💀", "🤡",
  "👻", "👽", "🤖", "😺", "🧡", "💛", "💚", "💙", "💜", "🖤",
  "🤍", "💔", "💗", "💖", "👋", "👌", "✌️", "🤞", "🤘", "👏",
  "🙌", "🤝", "🙏", "💪", "✨", "⚡", "🌟", "⭐", "🌈", "☀️",
  "🎊", "🎁", "🎄", "🎃", "✅", "❌", "❓", "❗", "💬", "💭",
  "🚀", "💎", "📺", "🎮", "🎵", "🎶", "📱", "💰", "🤯", "🎯", "🪙"
];

export function ReactionButton({ message, className }: ReactionButtonProps) {
  const { user } = useCurrentUser();
  const { reactionSummary, addReaction, removeReaction, isAddingReaction } = useReactions(message.id);
  const [emojiPopoverOpen, setEmojiPopoverOpen] = useState(false);
  const [isLongPress, setIsLongPress] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout>();
  const pressStartTime = useRef<number>();

  // Show reaction button even when not logged in, but disable interactions
  const isLoggedIn = !!user;

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isLoggedIn) return; // Don't handle interactions when not logged in
    
    e.preventDefault();
    pressStartTime.current = Date.now();
    setIsLongPress(false);
    
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true);
      setEmojiPopoverOpen(true);
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500); // 500ms for long press
  };

  const handleMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isLoggedIn) return; // Don't handle interactions when not logged in
    
    e.preventDefault();
    
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    const pressDuration = Date.now() - (pressStartTime.current || 0);
    
    // If it was a short press (not long press), handle like/unlike
    if (!isLongPress && pressDuration < 500) {
      if (reactionSummary.userLiked) {
        removeReaction({ targetEvent: message, content: "+" });
      } else {
        addReaction({ targetEvent: message, content: "+" });
      }
    }
    
    setIsLongPress(false);
  };

  const handleMouseLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    setIsLongPress(false);
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
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
          >
            <Heart className={cn("h-3 w-3 mr-1", reactionSummary.userLiked && "fill-current")} />
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
          {reactionSummary.reactions.map((reaction) => (
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
              <span className="mr-0.5">{reaction.content}</span>
              <span className="tabular-nums">{reaction.count}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}