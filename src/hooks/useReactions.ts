import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import { useNostrPublish } from "./useNostrPublish";
import { useCurrentUser } from "./useCurrentUser";
import type { NostrEvent } from "@nostrify/nostrify";

export interface ReactionSummary {
  likes: number;
  reactions: Array<{
    content: string;
    count: number;
    userReacted: boolean;
  }>;
  userLiked: boolean;
}

export function useReactions(eventId: string | null) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutate: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  const queryKey = ["reactions", eventId];

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
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Process reactions into summary
  const reactionSummary: ReactionSummary = {
    likes: 0,
    reactions: [],
    userLiked: false,
  };

  if (reactions.length > 0) {
    const reactionMap = new Map<string, { count: number; userReacted: boolean }>();
    
    reactions.forEach((reaction) => {
      const content = reaction.content.trim();
      const isLike = content === "+" || content === "";
      const isUserReaction = user?.pubkey === reaction.pubkey;
      
      if (isLike) {
        reactionSummary.likes++;
        if (isUserReaction) {
          reactionSummary.userLiked = true;
        }
      } else {
        // Handle emoji reactions
        const existing = reactionMap.get(content) || { count: 0, userReacted: false };
        reactionMap.set(content, {
          count: existing.count + 1,
          userReacted: existing.userReacted || isUserReaction,
        });
      }
    });

    // Convert emoji reactions to array
    reactionSummary.reactions = Array.from(reactionMap.entries()).map(([content, data]) => ({
      content,
      count: data.count,
      userReacted: data.userReacted,
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