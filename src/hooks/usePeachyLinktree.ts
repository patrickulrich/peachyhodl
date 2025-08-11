import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

export interface LinktreeEntry {
  id: string;
  title: string;
  url: string;
  description?: string;
  icon?: string;
}

export function usePeachyLinktree() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['peachy-linktree'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);
      
      // Query for Peachy's 'peachy-linktree' bookmark set (kind 30003) per NIP-51
      const events = await nostr.query([{
        kinds: [30003],
        authors: [PEACHY_PUBKEY],
        '#d': ['peachy-linktree'],
        limit: 1
      }], { signal });

      if (events.length === 0) {
        return [];
      }

      const listEvent = events[0];
      const entries: LinktreeEntry[] = [];

      // Parse entries from tags
      // Each entry should have an 'r' tag with URL and optional title
      listEvent.tags.forEach((tag, index) => {
        if (tag[0] === 'r' && tag[1]) {
          const url = tag[1];
          const title = tag[2] || url;
          const description = tag[3] || '';
          
          entries.push({
            id: `entry-${index}`,
            title,
            url,
            description,
            // Try to extract domain for icon
            icon: getDomainIcon(url)
          });
        }
      });

      return entries;
    },
    staleTime: 60000, // Cache for 1 minute
    gcTime: 300000, // Keep in cache for 5 minutes (renamed from cacheTime in newer versions)
  });
}

function getDomainIcon(url: string): string {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    
    // Map common domains to icons
    const iconMap: Record<string, string> = {
      'twitter.com': '🐦',
      'x.com': '❌',
      'github.com': '🐙',
      'youtube.com': '📺',
      'youtu.be': '📺',
      'twitch.tv': '💜',
      'instagram.com': '📸',
      'linkedin.com': '💼',
      'discord.gg': '💬',
      'discord.com': '💬',
      'telegram.org': '📱',
      't.me': '📱',
      'medium.com': '📝',
      'substack.com': '📰',
      'podcast': '🎧',
      'spotify.com': '🎵',
      'apple.com': '🍎',
      'nostr': '⚡',
      'bitcoin': '₿',
      'lightning': '⚡'
    };
    
    // Check for exact domain matches
    if (iconMap[domain]) {
      return iconMap[domain];
    }
    
    // Check for partial matches
    for (const [key, icon] of Object.entries(iconMap)) {
      if (domain.includes(key.split('.')[0])) {
        return icon;
      }
    }
    
    // Default icon based on URL type
    if (url.includes('podcast') || url.includes('audio')) return '🎧';
    if (url.includes('video') || url.includes('stream')) return '📺';
    if (url.includes('blog') || url.includes('article')) return '📝';
    if (url.includes('shop') || url.includes('store')) return '🛒';
    if (url.includes('nostr:') || url.includes('npub1')) return '⚡';
    
    return '🔗';
  } catch {
    return '🔗';
  }
}