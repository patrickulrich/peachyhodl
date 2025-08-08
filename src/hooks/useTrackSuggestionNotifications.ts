import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { unwrapNIP17Message } from '@/lib/nip17-proper';

// Peachy's pubkey
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

export interface TrackSuggestion {
  id: string; // event id
  trackId: string;
  trackTitle: string;
  trackArtist: string;
  senderPubkey: string;
  senderName?: string;
  message: string;
  createdAt: number;
  isRead: boolean;
}

export function useTrackSuggestionNotifications() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  
  const isPeachy = user?.pubkey === PEACHY_PUBKEY;

  return useQuery({
    queryKey: ['track-suggestions', user?.pubkey],
    queryFn: async (context) => {
      if (!isPeachy || !user) {
        return [];
      }

      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);
      
      try {
        // Query ONLY for NIP-17 gift wraps (kind 1059) - no fallbacks
        const events = await nostr.query([
          {
            kinds: [1059], // NIP-17 gift wraps only
            '#p': [PEACHY_PUBKEY], // messages to Peachy
            limit: 100, // May need to process many to find track suggestions
          }
        ], { signal });

        // Process events and unwrap messages
        const suggestions: TrackSuggestion[] = [];
        
        for (const event of events) {
          try {
            // Use our unwrapping function which handles NIP-17 gift wraps
            const unwrapped = await unwrapNIP17Message(event, user.signer as { 
              nip44: { decrypt: (pubkey: string, content: string) => Promise<string> }; 
              getPublicKey: () => Promise<string>;
            });
            if (unwrapped && unwrapped.trackId) {
              suggestions.push({
                id: event.id,
                trackId: unwrapped.trackId,
                trackTitle: unwrapped.trackTitle || 'Unknown Track',
                trackArtist: unwrapped.trackArtist || 'Unknown Artist',
                senderPubkey: unwrapped.senderPubkey,
                message: unwrapped.message,
                createdAt: unwrapped.createdAt,
                isRead: false, // TODO: Implement read status tracking
              });
            }
          } catch (processError) {
            console.warn('Failed to process message:', processError);
            // Continue with other messages
          }
        }

        // Sort by creation time (newest first) and return
        return suggestions.sort((a, b) => b.createdAt - a.createdAt);
      } catch (error) {
        console.error('Failed to fetch track suggestions:', error);
        return [];
      }
    },
    enabled: isPeachy && !!user,
    refetchInterval: 30000, // Refresh every 30 seconds for new suggestions
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}



// Hook to get unread count
export function useUnreadSuggestionsCount() {
  const { data: suggestions = [] } = useTrackSuggestionNotifications();
  return suggestions.filter(s => !s.isRead).length;
}