import React from 'react';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Custom emoji data structure from NIP-30 emoji tags
 */
export interface CustomEmoji {
  shortcode: string;
  imageUrl: string;
}

/**
 * Extract custom emoji from event tags according to NIP-30
 * Format: ["emoji", <shortcode>, <image-url>]
 */
export function extractCustomEmoji(event: NostrEvent): CustomEmoji[] {
  const emojiTags = event.tags.filter(tag => tag[0] === 'emoji' && tag.length >= 3);
  
  return emojiTags.map(tag => ({
    shortcode: tag[1],
    imageUrl: tag[2]
  })).filter(emoji => {
    // Validate shortcode contains only alphanumeric characters and underscores
    return /^[a-zA-Z0-9_]+$/.test(emoji.shortcode) && emoji.imageUrl;
  });
}

/**
 * Parse content text and replace :shortcode: with custom emoji images
 * Returns an array of React nodes (text strings and JSX elements)
 */
export function parseCustomEmoji(content: string, customEmojis: CustomEmoji[]): React.ReactNode[] {
  if (customEmojis.length === 0) {
    return [content];
  }

  // Create a map for quick emoji lookup
  const emojiMap = new Map(
    customEmojis.map(emoji => [emoji.shortcode, emoji.imageUrl])
  );

  // Create regex to find all :shortcode: patterns
  const shortcodeRegex = /:([a-zA-Z0-9_]+):/g;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyCounter = 0;

  while ((match = shortcodeRegex.exec(content)) !== null) {
    const [fullMatch, shortcode] = match;
    const index = match.index;

    // Add text before this match
    if (index > lastIndex) {
      parts.push(content.substring(lastIndex, index));
    }

    // Check if we have a custom emoji for this shortcode
    const imageUrl = emojiMap.get(shortcode);
    if (imageUrl) {
      // Add custom emoji image
      parts.push(
        React.createElement('img', {
          key: `emoji-${keyCounter++}`,
          src: imageUrl,
          alt: `:${shortcode}:`,
          title: `:${shortcode}:`,
          className: "inline-block w-5 h-5 mx-0.5 align-middle",
          style: {
            verticalAlign: 'middle',
            maxHeight: '1.25rem',
            maxWidth: '1.25rem',
          },
          onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
            // Fallback to text if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const textNode = document.createTextNode(`:${shortcode}:`);
            target.parentNode?.insertBefore(textNode, target);
          }
        })
      );
    } else {
      // No custom emoji found, keep the original text
      parts.push(fullMatch);
    }

    lastIndex = index + fullMatch.length;
  }

  // Add any remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  // If no matches were found, return the original content
  if (parts.length === 0) {
    parts.push(content);
  }

  return parts;
}

/**
 * Simple function to check if content contains custom emoji shortcodes
 */
export function hasCustomEmojiShortcodes(content: string): boolean {
  return /:([a-zA-Z0-9_]+):/.test(content);
}

/**
 * Create emoji tags for publishing events with custom emoji
 * This helps when users want to include custom emoji in their posts
 */
export function createEmojiTags(emojis: CustomEmoji[]): string[][] {
  return emojis.map(emoji => ['emoji', emoji.shortcode, emoji.imageUrl]);
}

/**
 * Extract and parse custom emoji from JSON metadata (for kind 0 events)
 */
export function parseCustomEmojiInMetadata(
  metadata: Record<string, unknown> & { name?: string; about?: string },
  customEmojis: CustomEmoji[]
): Record<string, unknown> & {
  name?: React.ReactNode[] | string;
  about?: React.ReactNode[] | string;
} {
  const result: Record<string, unknown> = { ...metadata };

  if (metadata.name && hasCustomEmojiShortcodes(metadata.name)) {
    result.name = parseCustomEmoji(metadata.name, customEmojis);
  }

  if (metadata.about && hasCustomEmojiShortcodes(metadata.about)) {
    result.about = parseCustomEmoji(metadata.about, customEmojis);
  }

  return result;
}