import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';

interface ReadStatusData {
  lastViewedAt: number;
  readNotificationIds: string[];
}

const APP_DATA_IDENTIFIER = 'peachy-track-suggestions-read-status';

export function useNotificationReadStatus() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  // Query for existing read status
  const { data: readStatus, isLoading } = useQuery({
    queryKey: ['notification-read-status', user?.pubkey],
    queryFn: async (context) => {
      if (!user) return null;

      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(5000)]);
      
      const events = await nostr.query([
        {
          kinds: [30078], // NIP-78 Application-specific Data
          authors: [user.pubkey],
          '#d': [APP_DATA_IDENTIFIER],
          limit: 1,
        }
      ], { signal });

      if (events.length === 0) {
        return {
          lastViewedAt: 0,
          readNotificationIds: [],
        } as ReadStatusData;
      }

      try {
        const data = JSON.parse(events[0].content) as ReadStatusData;
        return {
          lastViewedAt: data.lastViewedAt || 0,
          readNotificationIds: data.readNotificationIds || [],
        };
      } catch (error) {
        console.warn('Failed to parse read status data:', error);
        return {
          lastViewedAt: 0,
          readNotificationIds: [],
        } as ReadStatusData;
      }
    },
    enabled: !!user,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Mutation to update read status
  const updateReadStatus = useMutation({
    mutationFn: async (updates: Partial<ReadStatusData>) => {
      if (!user) throw new Error('User not logged in');

      const currentData = readStatus || { lastViewedAt: 0, readNotificationIds: [] };
      const newData: ReadStatusData = {
        lastViewedAt: updates.lastViewedAt ?? currentData.lastViewedAt,
        readNotificationIds: updates.readNotificationIds ?? currentData.readNotificationIds,
      };

      // Publish NIP-78 event
      const event = await publishEvent({
        kind: 30078,
        content: JSON.stringify(newData),
        tags: [
          ['d', APP_DATA_IDENTIFIER],
          ['alt', 'Peachy track suggestion notification read status'],
        ],
      });

      return { event, data: newData };
    },
    onSuccess: (result) => {
      // Update the query cache
      queryClient.setQueryData(
        ['notification-read-status', user?.pubkey],
        result.data
      );
    },
  });

  // Mark notifications as viewed (updates lastViewedAt)
  const markAsViewed = () => {
    const now = Math.floor(Date.now() / 1000);
    updateReadStatus.mutate({ lastViewedAt: now });
  };

  // Mark specific notifications as read
  const markAsRead = (notificationIds: string[]) => {
    if (!readStatus) return;
    
    const currentReadIds = new Set(readStatus.readNotificationIds);
    notificationIds.forEach(id => currentReadIds.add(id));
    
    updateReadStatus.mutate({
      readNotificationIds: Array.from(currentReadIds),
    });
  };

  // Check if a notification is read
  const isNotificationRead = (notificationId: string, notificationCreatedAt: number): boolean => {
    if (!readStatus) return false;
    
    // If notification ID is explicitly marked as read
    if (readStatus.readNotificationIds.includes(notificationId)) {
      return true;
    }
    
    // If notification was created before last viewed time, consider it read
    return notificationCreatedAt <= readStatus.lastViewedAt;
  };

  // Get unread count for notifications
  const getUnreadCount = (notifications: Array<{ id: string; createdAt: number }>): number => {
    if (!readStatus) return notifications.length;
    
    return notifications.filter(notification => 
      !isNotificationRead(notification.id, notification.createdAt)
    ).length;
  };

  return {
    readStatus,
    isLoading,
    markAsViewed,
    markAsRead,
    isNotificationRead,
    getUnreadCount,
    isUpdating: updateReadStatus.isPending,
  };
}