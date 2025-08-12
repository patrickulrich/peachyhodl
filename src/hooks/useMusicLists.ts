import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

// Peachy's pubkey
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  genre?: string;
  image?: string;
  mediaUrl?: string;
  albumArtUrl?: string;
  artistArtUrl?: string;
  artistId?: string;
  albumId?: string;
  artistNpub?: string;
  msatTotal?: string;
  releaseDate?: string;
  description?: string;
  publishedAt?: number;
  waveform?: string;
  urls?: Array<{
    url: string;
    mimeType?: string;
    quality?: string;
  }>;
  createdAt: number;
  pubkey?: string;
}

export interface MusicList {
  id: string;
  pubkey: string;
  dTag: string;
  title?: string;
  description?: string;
  image?: string;
  tracks: MusicTrack[]; // Array of actual track objects for Wavlake
  createdAt: number;
  updatedAt: number;
}

// Traditional Nostr music list with track references as strings
export interface NostrMusicList {
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
function parseMusicList(event: NostrEvent): NostrMusicList | null {
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
      
      // Query for music tracks (Wavlake format)
      const events = await nostr.query([
        {
          kinds: [32123], // Wavlake tracks with NOM specification
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
        .filter((list): list is NostrMusicList => list !== null);

      // Sort by update time (newest first)
      return lists.sort((a, b) => b.updatedAt - a.updatedAt);
    },
  });
}

// Hook to get Peachy's Weekly Wavlake Picks (from custom Nostr event)
export function useWavlakePicks() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['wavlake-picks', PEACHY_PUBKEY],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      // Query for Peachy's custom wavlake-picks list
      const events = await nostr.query([
        {
          kinds: [30004], // NIP-51 Curation sets
          authors: [PEACHY_PUBKEY],
          '#d': ['wavlake-picks'],
          limit: 1,
        }
      ], { signal });

      if (events.length === 0) {
        return null; // No picks list found
      }

      // Get the most recent picks event
      const picksEvent = events.sort((a, b) => b.created_at - a.created_at)[0];
      
      // Extract track IDs from the event tags
      const trackIds = picksEvent.tags
        .filter(([tag]) => tag === 'r') // r tags contain the track URLs/IDs
        .map(([, value]) => value)
        .filter(Boolean);

      if (trackIds.length === 0) {
        return {
          id: picksEvent.id,
          pubkey: PEACHY_PUBKEY,
          dTag: 'wavlake-picks',
          title: picksEvent.tags.find(([tag]) => tag === 'title')?.[1] || "Peachy's Weekly Wavlake Picks",
          description: picksEvent.tags.find(([tag]) => tag === 'description')?.[1] || 'Curated Bitcoin music tracks from Wavlake',
          image: picksEvent.tags.find(([tag]) => tag === 'image')?.[1],
          tracks: [],
          createdAt: picksEvent.created_at,
          updatedAt: picksEvent.created_at,
        };
      }

      // Fetch track details from Wavlake API for each track ID
      // Import wavlakeAPI once for all requests
      const { wavlakeAPI } = await import('@/lib/wavlake');
      
      // Process track IDs and make parallel API calls
      const trackPromises = trackIds.map(async (trackId): Promise<MusicTrack | null> => {
        try {
          // Extract track ID from Wavlake URL if needed
          const actualTrackId = trackId.includes('wavlake.com') 
            ? trackId.split('/').pop()?.split('?')[0] 
            : trackId;
            
          if (!actualTrackId) return null;
          
          const track = await wavlakeAPI.getTrack(actualTrackId);
          return {
            id: track.id,
            title: track.title,
            artist: track.artist,
            album: track.albumTitle || undefined,
            duration: track.duration,
            image: track.albumArtUrl || track.artistArtUrl,
            mediaUrl: track.mediaUrl,
            albumArtUrl: track.albumArtUrl,
            artistArtUrl: track.artistArtUrl,
            artistId: track.artistId,
            albumId: track.albumId,
            artistNpub: track.artistNpub,
            msatTotal: track.msatTotal,
            releaseDate: track.releaseDate,
            description: `Track from ${track.artist} • Album: ${track.albumTitle}`,
            publishedAt: new Date(track.releaseDate).getTime() / 1000,
            urls: [{
              url: track.mediaUrl,
              mimeType: 'audio/mpeg',
              quality: 'stream'
            }],
            createdAt: Math.floor(Date.now() / 1000),
            pubkey: track.artistNpub,
          };
        } catch (error) {
          console.error(`Failed to fetch track ${trackId}:`, error);
          return null;
        }
      });
      
      // Wait for all requests to complete in parallel
      const trackResults = await Promise.all(trackPromises);
      
      // Filter out any null results from failed requests and ensure type safety
      const musicTracks = trackResults.filter((track): track is MusicTrack => track !== null);

      return {
        id: picksEvent.id,
        pubkey: PEACHY_PUBKEY,
        dTag: 'wavlake-picks',
        title: picksEvent.tags.find(([tag]) => tag === 'title')?.[1] || "Peachy's Weekly Wavlake Picks",
        description: picksEvent.tags.find(([tag]) => tag === 'description')?.[1] || 'Curated Bitcoin music tracks from Wavlake',
        image: picksEvent.tags.find(([tag]) => tag === 'image')?.[1] || musicTracks[0]?.image,
        tracks: musicTracks,
        createdAt: picksEvent.created_at,
        updatedAt: picksEvent.created_at,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter since this is custom curated content
  });
}

// Hook to get specific tracks referenced in a list
export function useTracksFromList(tracks: MusicTrack[] | string[]) {
  return useQuery({
    queryKey: ['tracks-from-list', tracks],
    queryFn: async () => {
      // If tracks is already an array of MusicTrack objects, return them directly
      if (tracks && tracks.length > 0 && typeof tracks[0] === 'object') {
        return tracks as MusicTrack[];
      }
      
      // If tracks is an array of strings (track IDs), fetch them from Wavlake
      if (tracks && tracks.length > 0 && typeof tracks[0] === 'string') {
        const trackIds = tracks as string[];
        
        // Import wavlakeAPI once for all requests
        const { wavlakeAPI } = await import('@/lib/wavlake');
        
        // Make all API calls in parallel instead of sequential
        const trackPromises = trackIds.map(async (trackId): Promise<MusicTrack | null> => {
          try {
            const track = await wavlakeAPI.getTrack(trackId);
            return {
              id: track.id,
              title: track.title,
              artist: track.artist,
              album: track.albumTitle || undefined,
              duration: track.duration,
              image: track.albumArtUrl || track.artistArtUrl,
              mediaUrl: track.mediaUrl,
              albumArtUrl: track.albumArtUrl,
              artistArtUrl: track.artistArtUrl,
              artistId: track.artistId,
              albumId: track.albumId,
              artistNpub: track.artistNpub,
              msatTotal: track.msatTotal,
              releaseDate: track.releaseDate,
              description: `Track from ${track.artist} • Album: ${track.albumTitle}`,
              publishedAt: new Date(track.releaseDate).getTime() / 1000,
              urls: [{
                url: track.mediaUrl,
                mimeType: 'audio/mpeg',
                quality: 'stream'
              }],
              createdAt: Math.floor(Date.now() / 1000),
              pubkey: track.artistNpub,
            };
          } catch (error) {
            console.error(`Failed to fetch track ${trackId}:`, error);
            return null; // Return null for failed requests
          }
        });
        
        // Wait for all requests to complete in parallel
        const fetchedTracks = await Promise.all(trackPromises);
        
        // Filter out any null results from failed requests and ensure type safety
        return fetchedTracks.filter((track): track is MusicTrack => track !== null);
      }
      
      return [];
    },
    enabled: tracks && tracks.length > 0,
  });
}