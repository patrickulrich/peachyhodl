import { useEffect, useState } from "react";
import { useNostr } from "@nostrify/react";
import type { NostrEvent } from "@nostrify/nostrify";

export function useLiveChat(liveEventId: string | null) {
  const { nostr } = useNostr();
  const [messages, setMessages] = useState<NostrEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!liveEventId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Create real-time subscription using AbortController for cleanup
    const abortController = new AbortController();
    
    const subscribeToMessages = async () => {
      try {
        // Use req() for real-time streaming of messages
        const messageStream = nostr.req(
          [
            {
              kinds: [1311],
              "#a": [liveEventId],
              limit: 100,
            },
          ],
          { signal: abortController.signal }
        );

        for await (const msg of messageStream) {
          if (msg[0] === 'EVENT') {
            const event = msg[2];
            setMessages(prev => {
              // Check if message already exists to prevent duplicates
              const exists = prev.some(msg => msg.id === event.id);
              if (exists) return prev;
              
              // Add new message and sort by timestamp
              const newMessages = [...prev, event];
              return newMessages.sort((a, b) => a.created_at - b.created_at);
            });
          } else if (msg[0] === 'EOSE') {
            // End of stored events - initial load complete
            setIsLoading(false);
          } else if (msg[0] === 'CLOSED') {
            console.log("Chat subscription closed");
            break;
          }
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error("Chat subscription error:", error);
        }
        setIsLoading(false);
      }
    };

    subscribeToMessages();

    // Cleanup subscription on unmount or dependency change
    return () => {
      abortController.abort();
    };
  }, [liveEventId, nostr]);

  return {
    data: messages,
    isLoading,
  };
}