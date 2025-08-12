import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import { useNostrPublish } from "./useNostrPublish";
import { useCurrentUser } from "./useCurrentUser";
import { useEffect, useRef, useMemo } from "react";
import type { NostrEvent } from "@nostrify/nostrify";

const PEACHY_HEX = '0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820';

export interface ReactionSummary {
  likes: number;
  reactions: Array<{
    content: string;
    count: number;
    userReacted: boolean;
    events: NostrEvent[]; // All reaction events for this content
  }>;
  userLiked: boolean;
  isModerated: boolean; // True if Peachy reacted with ❌
}

export function useReactions(eventId: string | null) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutate: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => ["reactions", eventId], [eventId]);

  const { data: reactions = [], isLoading } = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      if (!eventId) return [];
      
      const timeoutSignal = AbortSignal.timeout(3000);
      const combinedSignal = AbortSignal.any([signal, timeoutSignal]);
      
      const events = await nostr.query([{
        kinds: [7],
        "#e": [eventId],
        limit: 500,
      }], { signal: combinedSignal });
      
      return events;
    },
    enabled: !!eventId,
    staleTime: 1000, // Reduced from 30 seconds to 1 second for faster moderation updates
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Set up real-time subscription for new reactions
  const subscriptionRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!eventId) return;

    // Cancel any existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.abort();
    }

    // Create new subscription
    subscriptionRef.current = new AbortController();
    const signal = subscriptionRef.current.signal;

    const subscribeToReactions = async () => {
      try {
        // console.log('Setting up reaction subscription for event:', eventId.slice(0, 8));
        const reactionStream = nostr.req([{
          kinds: [7],
          "#e": [eventId],
        }], { signal });

        for await (const msg of reactionStream) {
          if (msg[0] === 'EVENT') {
            const event = msg[2];
            // Only log moderation reactions to reduce noise
            if (event.content === "❌" && event.pubkey === PEACHY_HEX) {
              console.log('🛡️ Moderation reaction received for event:', eventId.slice(0, 8));
            }
            // Immediately invalidate queries to trigger refetch with new reaction
            queryClient.invalidateQueries({ queryKey });
            
            // Also trigger a specific refetch to be more aggressive
            setTimeout(() => {
              queryClient.refetchQueries({ queryKey });
            }, 100);
          } else if (msg[0] === 'EOSE') {
            // console.log('Reaction subscription EOSE for event:', eventId.slice(0, 8));
          } else if (msg[0] === 'CLOSED') {
            // console.log('Reaction subscription closed for event:', eventId.slice(0, 8));
            break;
          }
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.warn("Reaction subscription error:", error);
        }
      }
    };

    // Start subscription immediately
    subscribeToReactions();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.abort();
      }
    };
  }, [eventId, nostr, queryClient, queryKey]);

  // Process reactions into summary
  const reactionSummary: ReactionSummary = {
    likes: 0,
    reactions: [],
    userLiked: false,
    isModerated: false,
  };

  if (reactions.length > 0) {
    const reactionMap = new Map<string, { count: number; userReacted: boolean; events: NostrEvent[] }>();
    
    reactions.forEach((reaction) => {
      const content = reaction.content.trim();
      const isLike = content === "+" || content === "";
      const isUserReaction = user?.pubkey === reaction.pubkey;
      const isPeachyReaction = reaction.pubkey === PEACHY_HEX;
      
      // Check if Peachy moderated this message with ❌
      if (isPeachyReaction && content === "❌") {
        reactionSummary.isModerated = true;
      }
      
      if (isLike) {
        reactionSummary.likes++;
        if (isUserReaction) {
          reactionSummary.userLiked = true;
        }
      } else {
        // Handle emoji reactions
        const existing = reactionMap.get(content) || { count: 0, userReacted: false, events: [] };
        reactionMap.set(content, {
          count: existing.count + 1,
          userReacted: existing.userReacted || isUserReaction,
          events: [...existing.events, reaction],
        });
      }
    });

    // Convert emoji reactions to array
    reactionSummary.reactions = Array.from(reactionMap.entries()).map(([content, data]) => ({
      content,
      count: data.count,
      userReacted: data.userReacted,
      events: data.events,
    }));
  }

  const addReaction = useMutation({
    mutationFn: async ({ targetEvent, content = "+" }: { targetEvent: NostrEvent; content?: string }) => {
      if (!user) throw new Error("User not logged in");

      const tags: string[][] = [
        ["e", targetEvent.id, "", ""],
        ["p", targetEvent.pubkey, ""],
        ["k", targetEvent.kind.toString()],
      ];

      publishEvent({
        kind: 7,
        content,
        tags,
      });
    },
    onSuccess: () => {
      // Invalidate reactions query to refetch
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const removeReaction = useMutation({
    mutationFn: async ({ content = "+" }: { targetEvent: NostrEvent; content?: string }) => {
      if (!user) throw new Error("User not logged in");

      // Find existing reaction to remove
      const existingReaction = reactions.find(r => 
        r.pubkey === user.pubkey && 
        r.content.trim() === content.trim()
      );

      if (existingReaction) {
        // Publish a deletion event (kind 5)
        const tags: string[][] = [
          ["e", existingReaction.id],
        ];

        publishEvent({
          kind: 5,
          content: "",
          tags,
        });
      }
    },
    onSuccess: () => {
      // Invalidate reactions query to refetch
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    reactions,
    reactionSummary,
    isLoading,
    addReaction: addReaction.mutate,
    removeReaction: removeReaction.mutate,
    isAddingReaction: addReaction.isPending,
  };
}