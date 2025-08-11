import { useReactions } from "./useReactions";

/**
 * Hook to check if a message has been moderated by Peachy
 * Returns true if Peachy has reacted with ❌ to the message
 */
export function useMessageModeration(messageId: string | null) {
  const { reactionSummary } = useReactions(messageId);
  
  // Log only when moderation status changes for debugging
  // if (reactionSummary.isModerated && messageId) {
  //   console.log('Message is moderated:', messageId.slice(0, 8));
  // }
  
  return {
    isModerated: reactionSummary.isModerated,
    reactionSummary,
  };
}