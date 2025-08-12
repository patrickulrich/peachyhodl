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
    
    // Simple timeout for better UX - don't wait forever for EOSE
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // 2 second timeout
    
    const subscribeToMessages = async () => {
      try {
        const filters = [
          {
            kinds: [1311],
            "#a": [liveEventId],
            limit: 100,
          }
        ];
        
        // Use req() for real-time streaming of messages
        const messageStream = nostr.req(filters, { signal: abortController.signal });

        for await (const msg of messageStream) {
          if (msg[0] === 'EVENT') {
            const event = msg[2];
            
            // Handle chat messages
            setMessages(prev => {
              // Check if message already exists to prevent duplicates
              const exists = prev.some(msg => msg.id === event.id);
              if (exists) return prev;
              
              // Add new message and sort by timestamp
              const newMessages = [...prev, event];
              return newMessages.sort((a, b) => a.created_at - b.created_at);
            });
          } else if (msg[0] === 'EOSE') {
            clearTimeout(loadingTimeout);
            setIsLoading(false);
          } else if (msg[0] === 'CLOSED') {
            clearTimeout(loadingTimeout);
            break;
          }
        }
      } catch (error) {
        clearTimeout(loadingTimeout);
        if (error.name !== 'AbortError') {
          console.error("Chat subscription error:", error);
        }
        setIsLoading(false);
      }
    };

    subscribeToMessages();

    // Cleanup subscription on unmount or dependency change
    return () => {
      clearTimeout(loadingTimeout);
      abortController.abort();
    };
  }, [liveEventId, nostr]);

  return {
    data: messages,
    isLoading,
  };
}