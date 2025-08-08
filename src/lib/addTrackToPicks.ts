import type { MusicTrack } from '@/hooks/useMusicLists';
import type { NostrEvent } from '@nostrify/nostrify';
import type { QueryClient } from '@tanstack/react-query';

// Note: This is a simplified version. In a real implementation, you'd want to:
// 1. Fetch the current wavlake-picks list
// 2. Merge the new track with existing tracks
// 3. Publish the updated list
// 
// For now, this adds individual track references which will be picked up by the system

interface ToastOptions {
  title: string;
  description: string;
  variant?: 'destructive';
}

export async function addTrackToPicksSimple(
  track: MusicTrack, 
  publishEvent: (event: Record<string, unknown>) => Promise<NostrEvent>,
  toast: (options: ToastOptions) => void,
  queryClient: QueryClient
) {
  try {
    // Get current picks to merge with new track
    const currentPicksData = queryClient.getQueryData(['wavlake-picks', '0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820']);
    
    // Build existing track references
    const existingTrackRefs: string[][] = [];
    if (currentPicksData && typeof currentPicksData === 'object' && 'tracks' in currentPicksData) {
      const currentTracks = (currentPicksData as { tracks?: MusicTrack[] }).tracks || [];
      // Filter out the track we're adding to avoid false duplicates from optimistic updates
      const tracksToInclude = currentTracks.filter((t) => t.id !== track.id);
      existingTrackRefs.push(...tracksToInclude.map((t) => ['r', t.id]));
    }
    
    // Add new track reference to existing ones
    const allTrackRefs = [...existingTrackRefs, ['r', track.id]];

    // Publish to Nostr
    const publishedEvent = await publishEvent({
      kind: 30004, // NIP-51 Curation Set
      content: 'Curated Bitcoin music tracks from Wavlake',
      tags: [
        ['d', 'wavlake-picks'], // Identifier for the list
        ['title', "Peachy's Weekly Wavlake Picks"],
        ['description', 'Curated Bitcoin music tracks from Wavlake'],
        ...allTrackRefs, // Include all track references (existing + new)
      ],
    });

    // Success toast is handled by the calling function to avoid duplicates

    // Wait a moment before invalidating to ensure the event has propagated
    setTimeout(() => {
      queryClient.invalidateQueries({
        queryKey: ['wavlake-picks', '0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820']
      });
    }, 500);

    console.log('Successfully published track to picks:', publishedEvent.id);
    return true;
  } catch (error) {
    console.error('Failed to add track to picks:', error);
    toast({
      title: 'Failed to Add Track',
      description: 'Could not add track to your picks. Please try again.',
      variant: 'destructive',
    });
    return false;
  }
}