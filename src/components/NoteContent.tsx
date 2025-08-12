import { useMemo, useState, useCallback } from 'react';
import { type NostrEvent } from '@nostrify/nostrify';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import { extractCustomEmoji, parseCustomEmoji } from '@/lib/customEmoji';
import { ProfileText } from '@/components/ProfileText';

interface NoteContentProps {
  event: NostrEvent;
  className?: string;
}

// Component for click-to-view image previews
function ImagePreview({ src }: { src: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasError, setHasError] = useState(false);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  const handleImageError = () => {
    setHasError(true);
  };

  if (hasError) {
    // Show as regular link if image fails to load
    return (
      <a 
        href={src} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-blue-500 hover:underline break-words"
      >
        {src}
      </a>
    );
  }

  return (
    <div className="my-2">
      {!isVisible ? (
        <button
          onClick={toggleVisibility}
          className="flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent/80 rounded-md transition-colors text-sm"
        >
          <Eye className="h-4 w-4" />
          <span>Click to view image</span>
        </button>
      ) : (
        <div className="space-y-2">
          <button
            onClick={toggleVisibility}
            className="flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent/80 rounded-md transition-colors text-sm"
          >
            <EyeOff className="h-4 w-4" />
            <span>Hide image</span>
          </button>
          <div className="border rounded-lg overflow-hidden max-w-sm">
            <img
              src={src}
              alt="Chat image"
              className="max-w-full h-auto"
              onError={handleImageError}
              loading="lazy"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Parses content of text note events so that URLs and hashtags are linkified. */
export function NoteContent({
  event, 
  className, 
}: NoteContentProps) {  
  // Helper function to parse URLs, Nostr references, and hashtags from string content
  const parseStringContent = useCallback((text: string, startKey: number): React.ReactNode[] => {
    // Regex to find URLs, Nostr references, and hashtags (NIP-19, NIP-21, NIP-27)
    const regex = /(https?:\/\/[^\s]+)|nostr:(npub1|note1|nprofile1|nevent1|naddr1)([023456789acdefghjklmnpqrstuvwxyz]+)|(#\w+)/g;
    
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyCounter = startKey;
    
    while ((match = regex.exec(text)) !== null) {
      const [fullMatch, url, nostrPrefix, nostrData, hashtag] = match;
      const index = match.index;
      
      // Add text before this match
      if (index > lastIndex) {
        parts.push(text.substring(lastIndex, index));
      }
      
      if (url) {
        // Check if URL is an image
        const imageExtensions = /\.(png|jpg|jpeg|gif|webp)(\?[^\s]*)?$/i;
        if (imageExtensions.test(url)) {
          // Handle image URLs with click-to-view
          parts.push(
            <ImagePreview key={`image-${keyCounter++}`} src={url} />
          );
        } else {
          // Handle regular URLs
          parts.push(
            <a 
              key={`url-${keyCounter++}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {url}
            </a>
          );
        }
      } else if (nostrPrefix && nostrData) {
        // Handle Nostr references
        try {
          const nostrId = `${nostrPrefix}${nostrData}`;
          const decoded = nip19.decode(nostrId);
          
          if (decoded.type === 'npub') {
            const pubkey = decoded.data;
            parts.push(
              <NostrMention key={`mention-${keyCounter++}`} pubkey={pubkey} />
            );
          } else if (decoded.type === 'nprofile') {
            const profileData = decoded.data;
            parts.push(
              <NostrMention key={`mention-${keyCounter++}`} pubkey={profileData.pubkey} />
            );
          } else if (decoded.type === 'note') {
            const eventId = decoded.data;
            parts.push(
              <Link 
                key={`nostr-${keyCounter++}`}
                to={`/${nostrId}`}
                className="text-blue-500 hover:underline font-mono text-xs bg-muted px-1 rounded"
                title={`Note ${eventId.slice(0, 8)}...`}
              >
                @{eventId.slice(0, 8)}...
              </Link>
            );
          } else if (decoded.type === 'nevent') {
            const eventData = decoded.data;
            parts.push(
              <Link 
                key={`nostr-${keyCounter++}`}
                to={`/${nostrId}`}
                className="text-blue-500 hover:underline font-mono text-xs bg-muted px-1 rounded"
                title={`Event ${eventData.id.slice(0, 8)}...`}
              >
                @{eventData.id.slice(0, 8)}...
              </Link>
            );
          } else if (decoded.type === 'naddr') {
            const addrData = decoded.data;
            const shortIdentifier = addrData.identifier.length > 8 
              ? `${addrData.identifier.slice(0, 8)}...` 
              : addrData.identifier || 'addr';
            parts.push(
              <Link 
                key={`nostr-${keyCounter++}`}
                to={`/${nostrId}`}
                className="text-purple-500 hover:underline font-mono text-xs bg-muted px-1 rounded"
                title={`Addressable event: ${addrData.identifier}`}
              >
                @{shortIdentifier}
              </Link>
            );
          } else {
            // For other types, just show as a link
            parts.push(
              <Link 
                key={`nostr-${keyCounter++}`}
                to={`/${nostrId}`}
                className="text-blue-500 hover:underline"
              >
                {fullMatch}
              </Link>
            );
          }
        } catch {
          // If decoding fails, just render as text
          parts.push(fullMatch);
        }
      } else if (hashtag) {
        // Handle hashtags
        const tag = hashtag.slice(1); // Remove the #
        parts.push(
          <Link 
            key={`hashtag-${keyCounter++}`}
            to={`/t/${tag}`}
            className="text-blue-500 hover:underline"
          >
            {hashtag}
          </Link>
        );
      }
      
      lastIndex = index + fullMatch.length;
    }
    
    // Add any remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    // If no special content was found, just use the plain text
    if (parts.length === 0) {
      parts.push(text);
    }
    
    return parts;
  }, []); // Empty dependency array since this function doesn't depend on any props or state

  // Process the content to render mentions, links, custom emoji, etc.
  const content = useMemo(() => {
    const text = event.content;
    
    // Extract custom emoji from event tags (NIP-30)
    const customEmojis = extractCustomEmoji(event);
    
    // First parse custom emoji, then parse URLs, Nostr references, and hashtags
    const emojiParsedContent = parseCustomEmoji(text, customEmojis);
    
    // If no custom emoji were found, emojiParsedContent will be [text]
    // We need to process each part for URLs, etc.
    const finalParts: React.ReactNode[] = [];
    let partKey = 0;
    
    emojiParsedContent.forEach((part, _index) => {
      if (typeof part === 'string') {
        // Process string parts for URLs, Nostr references, and hashtags
        const stringParts = parseStringContent(part, partKey);
        finalParts.push(...stringParts);
        partKey += stringParts.length;
      } else {
        // This is already a React element (custom emoji), add it directly
        finalParts.push(part);
        partKey++;
      }
    });
    
    return finalParts;
  }, [event, parseStringContent]);

  return (
    <div className={cn("whitespace-pre-wrap break-words", className)}>
      {content.length > 0 ? content : event.content}
    </div>
  );
}

// Helper component to display user mentions
function NostrMention({ pubkey }: { pubkey: string }) {
  const author = useAuthor(pubkey);
  const npub = nip19.npubEncode(pubkey);
  const hasRealName = !!author.data?.metadata?.name;
  const displayName = author.data?.metadata?.name ?? genUserName(pubkey);

  return (
    <Link 
      to={`/${npub}`}
      className={cn(
        "font-medium hover:underline",
        hasRealName 
          ? "text-blue-500" 
          : "text-gray-500 hover:text-gray-700"
      )}
    >
      @{hasRealName ? (
        <ProfileText 
          text={displayName}
          profileEvent={author.data?.event}
        />
      ) : (
        displayName
      )}
    </Link>
  );
}