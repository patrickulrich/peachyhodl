import { useQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import type { NostrEvent } from "@nostrify/nostrify";

// Peachy's vanity npub decoded to hex
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

interface UpcomingStreamData {
  event: NostrEvent;
  title: string | null;
  summary: string | null;
  image: string | null;
  startsAt: number | null; // Unix timestamp
  endsAt: number | null; // Unix timestamp
  status: string; // "planned" | "live" | "ended"
  participants: Array<{
    pubkey: string;
    role: string;
  }>;
}

export function useUpcomingStreams() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ["upcoming-streams", PEACHY_PUBKEY],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      // Query for Peachy's live events (kind: 30311)
      const events = await nostr.query(
        [
          {
            kinds: [30311],
            authors: [PEACHY_PUBKEY],
            limit: 20,
          },
        ],
        { signal }
      );

      // Transform and filter events
      const streamData: UpcomingStreamData[] = events
        .map((event): UpcomingStreamData => {
          const getTagValue = (tagName: string): string | null => {
            const tag = event.tags.find(([name]) => name === tagName);
            return tag ? tag[1] : null;
          };

          const participants = event.tags
            .filter(([tag]) => tag === "p")
            .map(([_, pubkey, __, role = "Participant"]) => ({
              pubkey,
              role,
            }));

          const startsTag = getTagValue("starts");
          const endsTag = getTagValue("ends");

          return {
            event,
            title: getTagValue("title"),
            summary: getTagValue("summary"),
            image: getTagValue("image"),
            startsAt: startsTag ? parseInt(startsTag) : null,
            endsAt: endsTag ? parseInt(endsTag) : null,
            status: getTagValue("status") || "planned",
            participants,
          };
        })
        .filter((stream) => {
          // Only include planned/future streams or currently live streams
          const now = Math.floor(Date.now() / 1000);
          return (
            stream.status === "planned" || 
            stream.status === "live" ||
            (stream.startsAt && stream.startsAt > now)
          );
        })
        .sort((a, b) => {
          // Sort by start time (earliest first)
          if (!a.startsAt && !b.startsAt) return b.event.created_at - a.event.created_at;
          if (!a.startsAt) return 1;
          if (!b.startsAt) return -1;
          return a.startsAt - b.startsAt;
        });

      return streamData;
    },
    refetchInterval: 60000, // Refetch every minute
  });
}