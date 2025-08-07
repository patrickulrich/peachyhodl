import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

// Peachy's pubkey
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

export interface LiveEvent {
  id: string;
  pubkey: string;
  dTag: string;
  title: string;
  summary?: string;
  image?: string;
  streaming?: string;
  recording?: string;
  starts?: number;
  ends?: number;
  status: 'planned' | 'live' | 'ended';
  currentParticipants?: number;
  totalParticipants?: number;
  participants: Array<{
    pubkey: string;
    relay?: string;
    role?: string;
    proof?: string;
  }>;
  hashtags: string[];
  relays: string[];
  createdAt: number;
}

function validateLiveEvent(event: NostrEvent): boolean {
  if (event.kind !== 30311) return false;
  
  const dTag = event.tags.find(([tag]) => tag === 'd')?.[1];
  const title = event.tags.find(([tag]) => tag === 'title')?.[1];
  
  // Must have d tag and title
  return !!(dTag && title);
}

function parseLiveEvent(event: NostrEvent): LiveEvent {
  const dTag = event.tags.find(([tag]) => tag === 'd')?.[1] || '';
  const title = event.tags.find(([tag]) => tag === 'title')?.[1] || '';
  const summary = event.tags.find(([tag]) => tag === 'summary')?.[1];
  const image = event.tags.find(([tag]) => tag === 'image')?.[1];
  const streaming = event.tags.find(([tag]) => tag === 'streaming')?.[1];
  const recording = event.tags.find(([tag]) => tag === 'recording')?.[1];
  const starts = event.tags.find(([tag]) => tag === 'starts')?.[1];
  const ends = event.tags.find(([tag]) => tag === 'ends')?.[1];
  const status = event.tags.find(([tag]) => tag === 'status')?.[1] as 'planned' | 'live' | 'ended' || 'planned';
  const currentParticipants = event.tags.find(([tag]) => tag === 'current_participants')?.[1];
  const totalParticipants = event.tags.find(([tag]) => tag === 'total_participants')?.[1];
  
  // Parse participants from p tags
  const participants = event.tags
    .filter(([tag]) => tag === 'p')
    .map(([_tag, pubkey, relay, role, proof]) => ({
      pubkey: pubkey || '',
      relay,
      role,
      proof,
    }))
    .filter(p => p.pubkey); // Only include valid pubkeys
    
  // Parse hashtags from t tags
  const hashtags = event.tags
    .filter(([tag]) => tag === 't')
    .map(([_tag, hashtag]) => hashtag)
    .filter(Boolean);
    
  // Parse relays
  const relays = event.tags
    .filter(([tag]) => tag === 'relays')
    .map(([_tag, ...urls]) => urls)
    .flat()
    .filter(Boolean);
  
  return {
    id: event.id,
    pubkey: event.pubkey,
    dTag,
    title,
    summary,
    image,
    streaming,
    recording,
    starts: starts ? parseInt(starts) : undefined,
    ends: ends ? parseInt(ends) : undefined,
    status,
    currentParticipants: currentParticipants ? parseInt(currentParticipants) : undefined,
    totalParticipants: totalParticipants ? parseInt(totalParticipants) : undefined,
    participants,
    hashtags,
    relays,
    createdAt: event.created_at,
  };
}

export function useLiveEvents() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['live-events', PEACHY_PUBKEY],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      // Query for Peachy's live events (kind:30311)
      const events = await nostr.query([
        {
          kinds: [30311],
          authors: [PEACHY_PUBKEY],
          limit: 50,
        }
      ], { signal });

      // Validate and parse events
      const validEvents = events.filter(validateLiveEvent);
      const liveEvents = validEvents.map(parseLiveEvent);
      
      // Sort by start time (upcoming first, then by creation time)
      return liveEvents.sort((a, b) => {
        // If both have start times, sort by that
        if (a.starts && b.starts) {
          return a.starts - b.starts;
        }
        
        // If only one has start time, prioritize it
        if (a.starts && !b.starts) return -1;
        if (!a.starts && b.starts) return 1;
        
        // Otherwise sort by creation time (newest first)
        return b.createdAt - a.createdAt;
      });
    },
  });
}

// Hook to get upcoming events only
export function useUpcomingLiveEvents() {
  const { data: allEvents, ...rest } = useLiveEvents();
  
  const upcomingEvents = allEvents?.filter(event => {
    // Include planned and live events
    if (event.status === 'planned' || event.status === 'live') return true;
    
    // Include events that haven't ended yet (if they have an end time)
    if (event.ends && event.ends > Date.now() / 1000) return true;
    
    return false;
  }) || [];
  
  return {
    data: upcomingEvents,
    ...rest,
  };
}