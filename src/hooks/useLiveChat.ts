import { useEffect, useState } from "react";
import { useNostr } from "@nostrify/react";
import type { NostrEvent } from "@nostrify/nostrify";

export function useLiveChat(liveEventId: string | null) {
  const { nostr } = useNostr();
  const [messages, setMessages] = useState<NostrEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!liveEventId) {
      console.log("🚫 Chat: No liveEventId provided");
      setMessages([]);
      setIsLoading(false);
      return;
    }

    console.log("🔄 Chat: Starting subscription for liveEventId:", liveEventId);
    setIsLoading(true);
    
    // Create real-time subscription using AbortController for cleanup
    const abortController = new AbortController();
    
    // Simple timeout for better UX - don't wait forever for EOSE
    const loadingTimeout = setTimeout(() => {
      console.log("⏰ Chat: Initial load timeout - setting isLoading to false");
      setIsLoading(false);
    }, 2000); // 2 second timeout
    
    const subscribeToMessages = async () => {
      try {
        const filter = {
          kinds: [1311],
          "#a": [liveEventId],
          limit: 100,
        };
        
        console.log("📡 Chat: Subscribing with filter:", filter);
        
        // Use req() for real-time streaming of messages
        const messageStream = nostr.req([filter], { signal: abortController.signal });

        console.log("🔗 Chat: Subscription stream created, waiting for messages...");

        for await (const msg of messageStream) {
          console.log("📨 Chat: Received message:", msg[0], msg.length > 1 ? "with data" : "");
          
          if (msg[0] === 'EVENT') {
            const event = msg[2];
            console.log("✉️ Chat: Received EVENT:", {
              id: event.id.substring(0, 8),
              content: event.content.substring(0, 50),
              author: event.pubkey.substring(0, 8),
              tags: event.tags
            });
            
            setMessages(prev => {
              // Check if message already exists to prevent duplicates
              const exists = prev.some(msg => msg.id === event.id);
              if (exists) return prev;
              
              // Add new message and sort by timestamp
              const newMessages = [...prev, event];
              return newMessages.sort((a, b) => a.created_at - b.created_at);
            });
          } else if (msg[0] === 'EOSE') {
            console.log("✅ Chat: Received EOSE, initial load complete - subscription continues for real-time");
            clearTimeout(loadingTimeout);
            setIsLoading(false);
          } else if (msg[0] === 'CLOSED') {
            console.log("🔒 Chat: Subscription closed by relay");
            clearTimeout(loadingTimeout);
            break;
          }
        }
      } catch (error) {
        clearTimeout(loadingTimeout);
        if (error.name !== 'AbortError') {
          console.error("❌ Chat: Subscription error:", error);
        }
        console.log("⚠️ Chat: Setting isLoading to false due to error");
        setIsLoading(false);
      }
    };

    subscribeToMessages();

    // Cleanup subscription on unmount or dependency change
    return () => {
      console.log("🧹 Chat: Cleaning up subscription");
      clearTimeout(loadingTimeout);
      abortController.abort();
    };
  }, [liveEventId, nostr]);

  return {
    data: messages,
    isLoading,
  };
}