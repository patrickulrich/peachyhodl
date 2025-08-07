import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

// Peachy's pubkey
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

export interface MusicTrack {
  id: string;
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  genre?: string;
  urls: Array<{
    url: string;
    mimeType?: string;
    quality?: string;
  }>;
  image?: string;
  waveform?: string;
  description?: string;
  publishedAt?: number;
  createdAt: number;
  pubkey: string;
}

export interface MusicList {
  id: string;
  pubkey: string;
  dTag: string;
  title?: string;
  description?: string;
  image?: string;
  tracks: string[]; // Array of track references (a tags or e tags)
  createdAt: number;
  updatedAt: number;
}

// Parse Wavlake-style music track (kind 32123 with NOM spec in content)
function parseMusicTrack(event: NostrEvent): MusicTrack | null {
  // Only handle Wavlake's kind 32123 events
  if (event.kind !== 32123) return null;

  try {
    // Parse the NOM (Nostr Open Media) spec from content field
    const nomData = JSON.parse(event.content);
    
    // Extract data from NOM spec
    const title = nomData.title;
    const artist = nomData.creator;
    const duration = nomData.duration;
    const publishedAt = nomData.published_at ? parseInt(nomData.published_at) : undefined;
    const enclosureUrl = nomData.enclosure; // The actual media file URL
    const _linkUrl = nomData.link; // The hosting site URL (for future use)
    const mimeType = nomData.type;

    // Build URLs array
    const urls: Array<{ url: string; mimeType?: string; quality?: string; }> = [];
    
    if (enclosureUrl) {
      urls.push({ 
        url: enclosureUrl, 
        mimeType: mimeType || 'audio/mpeg', 
        quality: 'stream' 
      });
    }

    // If no media URL found, skip this track
    if (urls.length === 0) return null;

    // Look for additional metadata in tags (fallback)
    const album = event.tags.find(([tag]) => tag === 'album')?.[1];
    const genre = event.tags.find(([tag]) => tag === 'genre')?.[1];
    const image = event.tags.find(([tag]) => tag === 'image')?.[1];
    const waveform = event.tags.find(([tag]) => tag === 'waveform')?.[1];

    return {
      id: event.id,
      title: title || 'Untitled',
      artist: artist || 'Unknown Artist',
      album,
      duration,
      genre,
      urls,
      image,
      waveform,
      description: nomData.guid || undefined, // Use GUID as description
      publishedAt,
      createdAt: event.created_at,
      pubkey: event.pubkey,
    };
  } catch (error) {
    console.error('Failed to parse music track event:', error);
    return null;
  }
}

// Parse NIP-51 music list (using curation sets kind 30004 or custom music sets)
function parseMusicList(event: NostrEvent): MusicList | null {
  // Support standard curation sets (30004) and potential music-specific sets
  if (![30004, 30005].includes(event.kind)) return null;

  const dTag = event.tags.find(([tag]) => tag === 'd')?.[1];
  if (!dTag) return null;

  const title = event.tags.find(([tag]) => tag === 'title')?.[1];
  const description = event.tags.find(([tag]) => tag === 'description')?.[1];
  const image = event.tags.find(([tag]) => tag === 'image')?.[1];

  // Extract track references from a, e, and r tags
  const tracks: string[] = [];
  
  event.tags
    .filter(([tag]) => tag === 'a' || tag === 'e' || tag === 'r')
    .forEach(([tag, value]) => {
      if (value) {
        // Store URLs directly for r tags, prefix others for type identification
        if (tag === 'r') {
          tracks.push(value); // Direct URLs
        } else {
          tracks.push(tag === 'a' ? value : `e:${value}`);
        }
      }
    });

  return {
    id: event.id,
    pubkey: event.pubkey,
    dTag,
    title,
    description: description || event.content || undefined,
    image,
    tracks,
    createdAt: event.created_at,
    updatedAt: event.created_at, // In NIP-51, created_at is the last update time
  };
}

// Hook to get all music tracks from Peachy
export function useMusicTracks() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['music-tracks', PEACHY_PUBKEY],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      // Query for music tracks (both current Wavlake kind and proposed standard)
      const events = await nostr.query([
        {
          kinds: [32123, 31337], // Wavlake + proposed standard
          authors: [PEACHY_PUBKEY],
          limit: 100,
        }
      ], { signal });

      // Parse and filter valid tracks
      const tracks = events
        .map(parseMusicTrack)
        .filter((track): track is MusicTrack => track !== null);

      // Sort by published date or creation time (newest first)
      return tracks.sort((a, b) => {
        const aTime = a.publishedAt || a.createdAt;
        const bTime = b.publishedAt || b.createdAt;
        return bTime - aTime;
      });
    },
  });
}

// Hook to get music lists from Peachy
export function useMusicLists() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['music-lists', PEACHY_PUBKEY],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      // Query for music curation sets
      const events = await nostr.query([
        {
          kinds: [30004, 30005], // Curation sets for music
          authors: [PEACHY_PUBKEY],
          limit: 50,
        }
      ], { signal });

      // Parse and filter valid lists
      const lists = events
        .map(parseMusicList)
        .filter((list): list is MusicList => list !== null);

      // Sort by update time (newest first)
      return lists.sort((a, b) => b.updatedAt - a.updatedAt);
    },
  });
}

// Hook to get Peachy's Weekly Wavlake Picks (look for specific list)
export function useWavlakePicks() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['wavlake-picks', PEACHY_PUBKEY],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      // Look for a list with "wavlake" or "weekly" in the d-tag or title
      const events = await nostr.query([
        {
          kinds: [30004, 30005],
          authors: [PEACHY_PUBKEY],
          '#d': ['wavlake-picks', 'weekly-picks', 'wavlake-weekly'],
          limit: 10,
        }
      ], { signal });

      // If no specific list found, try searching for any list with wavlake in the title
      if (events.length === 0) {
        const allLists = await nostr.query([
          {
            kinds: [30004, 30005],
            authors: [PEACHY_PUBKEY],
            limit: 20,
          }
        ], { signal });

        // Filter for lists that might be Wavlake picks
        const wavlakeLists = allLists.filter(event => {
          const title = event.tags.find(([tag]) => tag === 'title')?.[1]?.toLowerCase();
          const description = event.tags.find(([tag]) => tag === 'description')?.[1]?.toLowerCase();
          return title?.includes('wavlake') || description?.includes('wavlake') || 
                 title?.includes('weekly') || title?.includes('pick');
        });

        events.push(...wavlakeLists);
      }

      if (events.length === 0) return null;

      // Get the most recent Wavlake picks list
      const latestList = events.sort((a, b) => b.created_at - a.created_at)[0];
      return parseMusicList(latestList);
    },
  });
}

// Hook to get specific tracks referenced in a list
export function useTracksFromList(trackRefs: string[]) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['tracks-from-list', trackRefs],
    queryFn: async (c) => {
      if (!trackRefs || trackRefs.length === 0) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      // Separate different types of references
      const eventIds: string[] = [];
      const addresses: string[] = [];
      const urls: string[] = [];

      trackRefs.forEach(ref => {
        if (ref.startsWith('http')) {
          urls.push(ref);
        } else if (ref.startsWith('e:')) {
          eventIds.push(ref.substring(2));
        } else if (ref.includes(':')) {
          addresses.push(ref);
        } else {
          // Assume direct event ID (hex string)
          eventIds.push(ref);
        }
      });

      const allMusicEvents: NostrEvent[] = [];

      // First, try to get the events as kind 32123 directly
      if (eventIds.length > 0) {
        const musicEvents = await nostr.query([{
          ids: eventIds,
          kinds: [32123],
        }], { signal });
        
        allMusicEvents.push(...musicEvents);
        
        // If we didn't find them as kind 32123, maybe they're kind 1 references
        const missingIds = eventIds.filter(id => 
          !musicEvents.some(event => event.id === id)
        );
        
        if (missingIds.length > 0) {
          const kind1Events = await nostr.query([{
            ids: missingIds,
            kinds: [1],
          }], { signal });
          
          // Extract a tags pointing to kind 32123 events
          const musicEventRefs: string[] = [];
          
          kind1Events.forEach(event => {
            event.tags
              .filter(([tag, value]) => tag === 'a' && value?.includes('32123:'))
              .forEach(([, value]) => {
                if (value) musicEventRefs.push(value);
              });
          });
          
          if (musicEventRefs.length > 0) {
            // Parse addresses to get individual kind 32123 events
            const musicQueries = musicEventRefs.map(ref => {
              const [kind, pubkey, dTag] = ref.split(':');
              return {
                kinds: [parseInt(kind)],
                authors: [pubkey],
                '#d': [dTag],
              };
            });
            
            const referencedMusic = await nostr.query(musicQueries, { signal });
            allMusicEvents.push(...referencedMusic);
          }
        }
      }

      // Handle addressable event references
      if (addresses.length > 0) {
        const addressQueries = addresses.map(ref => {
          const [kind, pubkey, dTag] = ref.split(':');
          return {
            kinds: [parseInt(kind)],
            authors: [pubkey],
            '#d': [dTag],
          };
        });
        
        const addressableEvents = await nostr.query(addressQueries, { signal });
        allMusicEvents.push(...addressableEvents);
      }

      // Parse tracks and return
      const tracks = allMusicEvents
        .map(parseMusicTrack)
        .filter((track): track is MusicTrack => track !== null);

      return tracks;
    },
    enabled: trackRefs && trackRefs.length > 0,
  });
}