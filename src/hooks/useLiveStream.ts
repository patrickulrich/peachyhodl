import { useQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import type { NostrEvent } from "@nostrify/nostrify";

// Peachy's vanity npub decoded to hex
// npub1peachy0e223un984r54xnu9k93mcjk92mp27zrl03qfmcwpwmqsqt2agsv
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

interface LiveStreamData {
  event: NostrEvent | null;
  isLive: boolean;
  streamUrl: string | null;
  title: string | null;
  summary: string | null;
  image: string | null;
  participants: Array<{
    pubkey: string;
    role: string;
  }>;
}

export function useLiveStream() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ["livestream", PEACHY_PUBKEY],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);
      
      // Query for live events where Peachy is a participant
      const allEvents = await nostr.query(
        [
          {
            kinds: [30311],
            limit: 100,
          },
        ],
        { signal }
      );
      
      // Filter for events where Peachy is a participant
      const peachyEvents = allEvents.filter(event => {
        // Check if Peachy's pubkey is in any p tag
        return event.tags.some(tag => 
          tag[0] === 'p' && tag[1] === PEACHY_PUBKEY
        );
      });
      

      // Find the most recent live event where Peachy is a participant
      const liveEvent = peachyEvents
        .sort((a, b) => b.created_at - a.created_at)
        .find((event) => {
          const statusTag = event.tags.find(([tag]) => tag === "status");
          return statusTag && statusTag[1] === "live";
        });

      if (!liveEvent) {
        return {
          event: null,
          isLive: false,
          streamUrl: null,
          title: null,
          summary: null,
          image: null,
          participants: [],
        } as LiveStreamData;
      }

      // Extract data from the live event
      const getTagValue = (tagName: string): string | null => {
        const tag = liveEvent.tags.find(([name]) => name === tagName);
        return tag ? tag[1] : null;
      };

      const participants = liveEvent.tags
        .filter(([tag]) => tag === "p")
        .map(([_, pubkey, __, role = "Participant"]) => ({
          pubkey,
          role,
        }));

      const streamData = {
        event: liveEvent,
        isLive: true,
        streamUrl: getTagValue("streaming"),
        title: getTagValue("title"),
        summary: getTagValue("summary"),
        image: getTagValue("image"),
        participants,
      } as LiveStreamData;
      
      
      return streamData;
    },
    refetchInterval: 30000, // Refetch every 30 seconds to check if still live
  });
}