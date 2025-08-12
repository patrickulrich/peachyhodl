import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Check if a user is mentioned in a Nostr event
 * Supports both NIP-08 'p' tags and NIP-27 text mentions (npub, nprofile)
 */
export function isUserMentioned(event: NostrEvent, userPubkey: string): boolean {
  // Check p tags (NIP-08 - mentions)
  const hasPTag = event.tags.some(tag => 
    tag[0] === 'p' && tag[1] === userPubkey
  );
  
  if (hasPTag) {
    return true;
  }

  // Check content for NIP-19 mentions (npub, nprofile)
  const content = event.content;
  
  // Find all NIP-19 identifiers in content
  const nip19Regex = /(npub1[023456789acdefghjklmnpqrstuvwxyz]{58}|nprofile1[023456789acdefghjklmnpqrstuvwxyz]+)/g;
  const matches = content.match(nip19Regex);
  
  if (!matches) {
    return false;
  }

  // Check if any of the NIP-19 identifiers reference our user
  for (const match of matches) {
    try {
      const decoded = nip19.decode(match);
      
      if (decoded.type === 'npub' && decoded.data === userPubkey) {
        return true;
      }
      
      if (decoded.type === 'nprofile' && decoded.data.pubkey === userPubkey) {
        return true;
      }
    } catch {
      // Invalid NIP-19 identifier, skip
      continue;
    }
  }

  return false;
}

/**
 * Extract all mentioned pubkeys from an event (both p tags and content mentions)
 */
export function extractMentionedPubkeys(event: NostrEvent): string[] {
  const pubkeys = new Set<string>();
  
  // Add pubkeys from p tags
  event.tags.forEach(tag => {
    if (tag[0] === 'p' && tag[1]) {
      pubkeys.add(tag[1]);
    }
  });

  // Add pubkeys from content mentions
  const content = event.content;
  const nip19Regex = /(npub1[023456789acdefghjklmnpqrstuvwxyz]{58}|nprofile1[023456789acdefghjklmnpqrstuvwxyz]+)/g;
  const matches = content.match(nip19Regex);
  
  if (matches) {
    for (const match of matches) {
      try {
        const decoded = nip19.decode(match);
        
        if (decoded.type === 'npub') {
          pubkeys.add(decoded.data);
        } else if (decoded.type === 'nprofile') {
          pubkeys.add(decoded.data.pubkey);
        }
      } catch {
        // Invalid NIP-19 identifier, skip
        continue;
      }
    }
  }

  return Array.from(pubkeys);
}