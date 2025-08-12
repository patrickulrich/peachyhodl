import { useMemo } from 'react';
import type { NostrEvent } from '@nostrify/nostrify';
import { extractCustomEmoji, parseCustomEmoji } from '@/lib/customEmoji';

interface ReactionContentProps {
  /** The reaction content (emoji or custom emoji shortcode) */
  content: string;
  /** The reaction event that may contain custom emoji tags */
  reactionEvent?: NostrEvent;
}

/**
 * Component to render reaction content with NIP-30 custom emoji support
 * Handles both standard emoji and custom emoji :shortcode: patterns
 */
export function ReactionContent({ content, reactionEvent }: ReactionContentProps) {
  const parsedContent = useMemo(() => {
    if (!reactionEvent) {
      // No event available, just render as regular text/emoji
      return [content];
    }

    // Extract custom emoji from the reaction event (kind 7)
    const customEmojis = extractCustomEmoji(reactionEvent);
    
    if (customEmojis.length === 0) {
      // No custom emoji in this reaction, render as standard content
      return [content];
    }
    
    // Parse the reaction content for custom emoji shortcodes
    return parseCustomEmoji(content, customEmojis);
  }, [content, reactionEvent]);

  return (
    <span className="inline-flex items-baseline">
      {parsedContent}
    </span>
  );
}