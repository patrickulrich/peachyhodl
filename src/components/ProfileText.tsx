import { useMemo } from 'react';
import type { NostrEvent } from '@nostrify/nostrify';
import { extractCustomEmoji, parseCustomEmoji } from '@/lib/customEmoji';
import { cn } from '@/lib/utils';

interface ProfileTextProps {
  /** The text content to render (e.g., profile name or about) */
  text: string;
  /** The kind 0 profile event that may contain custom emoji tags */
  profileEvent?: NostrEvent;
  /** Additional CSS classes */
  className?: string;
  /** Whether to preserve whitespace and line breaks */
  preserveWhitespace?: boolean;
}

/**
 * Component to render profile text (names, about sections) with NIP-30 custom emoji support
 * Automatically extracts emoji tags from the provided profile event and renders :shortcode: as images
 */
export function ProfileText({ 
  text, 
  profileEvent, 
  className, 
  preserveWhitespace = false 
}: ProfileTextProps) {
  const parsedContent = useMemo(() => {
    if (!profileEvent) {
      return [text];
    }

    // Extract custom emoji from the profile event (kind 0)
    const customEmojis = extractCustomEmoji(profileEvent);
    
    // Parse the text content for custom emoji
    return parseCustomEmoji(text, customEmojis);
  }, [text, profileEvent]);

  return (
    <span 
      className={cn(
        "inline-flex items-baseline flex-wrap gap-0",
        preserveWhitespace && "whitespace-pre-wrap",
        className
      )}
    >
      {parsedContent}
    </span>
  );
}