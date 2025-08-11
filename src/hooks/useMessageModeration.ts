import { useReactions } from "./useReactions";

/**
 * Hook to check if a message has been moderated by Peachy
 * Returns true if Peachy has reacted with ❌ to the message
 */
export function useMessageModeration(messageId: string | null) {
  const { reactionSummary } = useReactions(messageId);
  
  return {
    isModerated: reactionSummary.isModerated,
    reactionSummary,
  };
}