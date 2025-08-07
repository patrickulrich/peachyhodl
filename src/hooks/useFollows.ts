import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import { useCurrentUser } from "./useCurrentUser";
import { useNostrPublish } from "./useNostrPublish";

interface FollowData {
  pubkey: string;
  relay?: string;
  petname?: string;
}

export function useFollows() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ["follows", user?.pubkey],
    enabled: !!user,
    queryFn: async (c) => {
      if (!user) return [];
      
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      // Query for user's follow list (kind: 3)
      const events = await nostr.query(
        [
          {
            kinds: [3],
            authors: [user.pubkey],
            limit: 1,
          },
        ],
        { signal }
      );

      // Get the most recent follow list
      const followListEvent = events
        .sort((a, b) => b.created_at - a.created_at)[0];

      if (!followListEvent) return [];

      // Extract follows from p tags
      const follows: FollowData[] = followListEvent.tags
        .filter(([tag]) => tag === "p")
        .map(([_, pubkey, relay = "", petname = ""]) => ({
          pubkey,
          relay: relay || undefined,
          petname: petname || undefined,
        }));

      return follows;
    },
  });
}

export function useIsFollowing(pubkey: string) {
  const { data: follows = [] } = useFollows();
  return follows.some(follow => follow.pubkey === pubkey);
}

export function useFollowUser() {
  const { user } = useCurrentUser();
  const { data: follows = [] } = useFollows();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pubkey, relay, petname }: { pubkey: string; relay?: string; petname?: string }) => {
      if (!user) throw new Error("Must be logged in to follow users");

      // Check if already following
      const isAlreadyFollowing = follows.some(f => f.pubkey === pubkey);
      
      let newFollows: FollowData[];
      if (isAlreadyFollowing) {
        // Unfollow: remove from the list
        newFollows = follows.filter(f => f.pubkey !== pubkey);
      } else {
        // Follow: add to the list
        newFollows = [...follows, { pubkey, relay, petname }];
      }

      // Create the p tags for the follow list
      const pTags = newFollows.map(follow => [
        "p", 
        follow.pubkey, 
        follow.relay || "", 
        follow.petname || ""
      ]);

      // Publish the new follow list
      await publishEvent({
        kind: 3,
        content: "",
        tags: pTags,
      });

      return !isAlreadyFollowing; // Return new following state
    },
    onSuccess: () => {
      // Invalidate and refetch follows
      queryClient.invalidateQueries({ queryKey: ["follows", user?.pubkey] });
    },
  });
}