import { useQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";

export function useLiveChat(liveEventId: string | null) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ["live-chat", liveEventId],
    enabled: !!liveEventId,
    queryFn: async (c) => {
      if (!liveEventId) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      // Query for chat messages (kind: 1311) for this live event
      const messages = await nostr.query(
        [
          {
            kinds: [1311],
            "#a": [liveEventId],
            limit: 100,
          },
        ],
        { signal }
      );

      // Sort messages by timestamp (newest last)
      return messages.sort((a, b) => a.created_at - b.created_at);
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });
}