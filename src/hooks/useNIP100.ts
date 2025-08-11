import { useCallback, useEffect, useRef, useState } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from './useCurrentUser';
import { useNostrPublish } from './useNostrPublish';
import { useToast } from './useToast';
import type { NostrEvent } from '@nostrify/nostrify';

// Peachy's vanity npub decoded to hex
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

// Site-wide audio room constants
export const PEACHY_AUDIO_ROOM = {
  id: "peachy-main-audio-room",
  name: "Peachy's Audio Room",
};

export interface WebRTCSignalingEvent {
  id: string;
  pubkey: string;
  type: 'connect' | 'disconnect' | 'offer' | 'answer' | 'candidate' | 'kick' | 'ban';
  roomId?: string;
  targetPubkey?: string;
  content?: unknown;
  timestamp: number;
  reason?: string; // For kick/ban events
}

export interface AudioRoom {
  id: string;
  name: string;
  participants: string[];
  isPrivate: boolean;
  createdBy: string;
  createdAt: number;
}

export function useNIP100() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const { toast } = useToast();

  const [isListening, setIsListening] = useState(false);
  const [connectedRooms, setConnectedRooms] = useState<Set<string>>(new Set());
  const [availableRooms, setAvailableRooms] = useState<Map<string, AudioRoom>>(new Map());
  const [moderators, setModerators] = useState<Set<string>>(new Set([PEACHY_PUBKEY]));
  const [bannedUsers, setBannedUsers] = useState<Set<string>>(new Set());
  
  // Participant presence tracking
  const participantTimestampsRef = useRef<Map<string, number>>(new Map());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const eventHandlersRef = useRef<Map<string, (event: WebRTCSignalingEvent) => void>>(new Map());
  const subscriptionRef = useRef<{ close: () => void } | null>(null);
  const processedEventsRef = useRef<Set<string>>(new Set()); // Prevent duplicate event processing

  // Encrypt content for WebRTC signaling
  const encryptContent = useCallback(async (content: unknown, recipientPubkey: string): Promise<string> => {
    if (!user?.signer.nip04) {
      throw new Error('NIP-04 encryption not supported by signer');
    }
    
    const jsonContent = JSON.stringify(content);
    return await user.signer.nip04.encrypt(recipientPubkey, jsonContent);
  }, [user]);

  // Decrypt content from WebRTC signaling
  const decryptContent = useCallback(async (encryptedContent: string, senderPubkey: string): Promise<unknown> => {
    if (!user?.signer.nip04) {
      throw new Error('NIP-04 decryption not supported by signer');
    }

    const decrypted = await user.signer.nip04.decrypt(senderPubkey, encryptedContent);
    return JSON.parse(decrypted);
  }, [user]);

  // Encrypt room ID
  const encryptRoomId = useCallback(async (roomId: string, recipientPubkey: string): Promise<string> => {
    if (!user?.signer.nip04) {
      return roomId; // Fallback to unencrypted if not supported
    }
    return await user.signer.nip04.encrypt(recipientPubkey, roomId);
  }, [user]);

  // Publish connect event
  const publishConnect = useCallback(async (roomId?: string, _targetPubkeys?: string[]) => {
    if (!user) throw new Error('User not authenticated');

    const tags = [['type', 'connect']];
    
    // Add room ID tag - this is public so all participants can see which room
    if (roomId) {
      tags.push(['r', roomId]);
    }
    
    // NRTC pattern: Connect events are public broadcasts to announce presence
    // No specific targets - this is a room-wide announcement
    // Existing participants will see this and initiate connections TO the new user
    
    await publishEvent({
      kind: 25050,
      content: `Joining room: ${roomId || 'unknown'}`,
      tags,
    });

    if (roomId) {
      setConnectedRooms(prev => new Set(prev).add(roomId));
    }
  }, [user, publishEvent]);

  // Publish disconnect event
  const publishDisconnect = useCallback(async (roomId?: string, _targetPubkeys?: string[]) => {
    if (!user) throw new Error('User not authenticated');

    const tags = [['type', 'disconnect']];
    
    // NRTC pattern: Disconnect events are public broadcasts like connect events
    // This lets everyone in the room know someone left
    if (roomId) {
      tags.push(['r', roomId]);
    }

    await publishEvent({
      kind: 25050,
      content: `Leaving room: ${roomId || 'unknown'}`,
      tags,
    });

    if (roomId) {
      setConnectedRooms(prev => {
        const newSet = new Set(prev);
        newSet.delete(roomId);
        return newSet;
      });
    }
  }, [user, publishEvent]);

  // Publish WebRTC offer
  const publishOffer = useCallback(async (
    offer: RTCSessionDescriptionInit,
    recipientPubkey: string,
    roomId?: string
  ) => {
    if (!user) throw new Error('User not authenticated');

    const tags = [
      ['type', 'offer'],
      ['p', recipientPubkey],
    ];

    if (roomId) {
      const encryptedRoomId = await encryptRoomId(roomId, recipientPubkey);
      tags.push(['r', encryptedRoomId]);
    }

    const encryptedContent = await encryptContent({
      offer: offer.sdp,
      type: 'offer'
    }, recipientPubkey);

    await publishEvent({
      kind: 25050,
      content: encryptedContent,
      tags,
    });
  }, [user, publishEvent, encryptContent, encryptRoomId]);

  // Publish WebRTC answer
  const publishAnswer = useCallback(async (
    answer: RTCSessionDescriptionInit,
    recipientPubkey: string,
    roomId?: string
  ) => {
    if (!user) throw new Error('User not authenticated');

    const tags = [
      ['type', 'answer'],
      ['p', recipientPubkey],
    ];

    if (roomId) {
      const encryptedRoomId = await encryptRoomId(roomId, recipientPubkey);
      tags.push(['r', encryptedRoomId]);
    }

    const encryptedContent = await encryptContent({
      sdp: answer.sdp,
      type: 'answer'
    }, recipientPubkey);

    await publishEvent({
      kind: 25050,
      content: encryptedContent,
      tags,
    });
  }, [user, publishEvent, encryptContent, encryptRoomId]);

  // Publish ICE candidate
  const publishIceCandidate = useCallback(async (
    candidate: RTCIceCandidateInit,
    recipientPubkey: string,
    roomId?: string
  ) => {
    if (!user) throw new Error('User not authenticated');

    const tags = [
      ['type', 'candidate'],
      ['p', recipientPubkey],
    ];

    if (roomId) {
      const encryptedRoomId = await encryptRoomId(roomId, recipientPubkey);
      tags.push(['r', encryptedRoomId]);
    }

    const encryptedContent = await encryptContent({
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
    }, recipientPubkey);

    await publishEvent({
      kind: 25050,
      content: encryptedContent,
      tags,
    });
  }, [user, publishEvent, encryptContent, encryptRoomId]);

  // Check if current user is a moderator
  const isModerator = useCallback(() => {
    return user && moderators.has(user.pubkey);
  }, [user, moderators]);

  // Check if user is banned
  const isUserBanned = useCallback((pubkey: string) => {
    return bannedUsers.has(pubkey);
  }, [bannedUsers]);

  // Kick user from room (temporary removal)
  const kickUser = useCallback(async (targetPubkey: string, reason = 'Kicked by moderator') => {
    if (!user || !isModerator()) {
      throw new Error('Only moderators can kick users');
    }

    const tags = [
      ['type', 'kick'],
      ['p', targetPubkey],
      ['r', PEACHY_AUDIO_ROOM.id],
    ];

    await publishEvent({
      kind: 25050,
      content: reason,
      tags,
    });

    toast({
      title: 'User Kicked',
      description: `User has been removed from the audio room.`,
    });
  }, [user, isModerator, publishEvent, toast]);

  // Ban user from room (permanent removal)
  const banUser = useCallback(async (targetPubkey: string, reason = 'Banned by moderator') => {
    if (!user || !isModerator()) {
      throw new Error('Only moderators can ban users');
    }

    const tags = [
      ['type', 'ban'],
      ['p', targetPubkey],
      ['r', PEACHY_AUDIO_ROOM.id],
    ];

    await publishEvent({
      kind: 25050,
      content: reason,
      tags,
    });

    // Add to local banned users list
    setBannedUsers(prev => new Set(prev).add(targetPubkey));

    toast({
      title: 'User Banned',
      description: `User has been banned from the audio room.`,
    });
  }, [user, isModerator, publishEvent, toast]);

  // Add moderator (only Peachy can do this)
  const addModerator = useCallback(async (targetPubkey: string) => {
    if (!user || user.pubkey !== PEACHY_PUBKEY) {
      throw new Error('Only Peachy can add moderators');
    }

    setModerators(prev => new Set(prev).add(targetPubkey));

    toast({
      title: 'Moderator Added',
      description: `User has been granted moderator permissions.`,
    });
  }, [user, toast]);

  // Remove moderator (only Peachy can do this)
  const removeModerator = useCallback(async (targetPubkey: string) => {
    if (!user || user.pubkey !== PEACHY_PUBKEY) {
      throw new Error('Only Peachy can remove moderators');
    }

    if (targetPubkey === PEACHY_PUBKEY) {
      throw new Error('Cannot remove Peachy as moderator');
    }

    setModerators(prev => {
      const newSet = new Set(prev);
      newSet.delete(targetPubkey);
      return newSet;
    });

    toast({
      title: 'Moderator Removed',
      description: `User's moderator permissions have been revoked.`,
    });
  }, [user, toast]);

  // Register event handler for specific event types
  const registerEventHandler = useCallback((
    eventType: string,
    handler: (event: WebRTCSignalingEvent) => void
  ) => {
    eventHandlersRef.current.set(eventType, handler);
  }, []);

  // Unregister event handler
  const unregisterEventHandler = useCallback((eventType: string) => {
    eventHandlersRef.current.delete(eventType);
  }, []);

  // Cleanup stale participants (haven't been seen in 60 seconds)
  const cleanupStaleParticipants = useCallback(() => {
    const now = Date.now();
    const staleThreshold = 60000; // 60 seconds
    
    participantTimestampsRef.current.forEach((timestamp, pubkey) => {
      if (now - timestamp > staleThreshold) {
        console.log(`Removing stale participant: ${pubkey.substring(0, 8)}...`);
        participantTimestampsRef.current.delete(pubkey);
        
        // Remove from available rooms
        setAvailableRooms(prev => {
          const newRooms = new Map(prev);
          newRooms.forEach((room, roomId) => {
            if (room.participants.includes(pubkey)) {
              room.participants = room.participants.filter(p => p !== pubkey);
              if (room.participants.length === 0) {
                newRooms.delete(roomId);
              } else {
                newRooms.set(roomId, room);
              }
            }
          });
          return newRooms;
        });
      }
    });
  }, []);

  // Send periodic heartbeat to maintain presence
  const sendHeartbeat = useCallback(async () => {
    if (!user || connectedRooms.size === 0) return;
    
    try {
      // Send connect event as heartbeat for each connected room
      for (const roomId of connectedRooms) {
        await publishConnect(roomId);
      }
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
    }
  }, [user, connectedRooms, publishConnect]);

  // Start listening for WebRTC signaling events
  const startListening = useCallback(async () => {
    if (!user || isListening) return;

    setIsListening(true);

    try {
      // NRTC Pattern: Discover existing participants when joining
      // Get recent connect events so new joiners can find existing users
      const recentEvents: NostrEvent[] = [];
      
      try {
        // Query for recent connect events to discover existing participants
        const participantQuery = nostr.req([{
          kinds: [25050],
          '#r': [PEACHY_AUDIO_ROOM.id],
          since: Math.floor(Date.now() / 1000) - 60, // Last minute
          limit: 20,
        }], { signal: AbortSignal.timeout(2000) });

        for await (const msg of participantQuery) {
          if (msg[0] === 'EVENT') {
            const event = msg[2];
            const typeTag = event.tags.find(([tag]) => tag === 'type')?.[1];
            if (typeTag === 'connect' && event.pubkey !== user.pubkey) {
              recentEvents.push(event);
            }
          } else if (msg[0] === 'EOSE') {
            break; // Got all recent events
          }
        }
      } catch {
        console.log('Could not fetch recent participants, continuing...');
      }

      const handleEvent = async (event: NostrEvent) => {
        try {
          // Skip if we've already processed this event
          if (processedEventsRef.current.has(event.id)) return;
          processedEventsRef.current.add(event.id);

          const typeTag = event.tags.find(([tag]) => tag === 'type')?.[1];
          const targetPubkey = event.tags.find(([tag]) => tag === 'p')?.[1];
          const roomTag = event.tags.find(([tag]) => tag === 'r')?.[1];

          if (!typeTag || event.pubkey === user.pubkey) return; // Skip our own events

          let content: unknown = null;
          let roomId: string | undefined = undefined;

          // Decrypt content for offer, answer, candidate events
          if (['offer', 'answer', 'candidate'].includes(typeTag) && event.content) {
            content = await decryptContent(event.content, event.pubkey);
          }

          // Decrypt room ID if present
          if (roomTag && user.signer.nip04) {
            try {
              roomId = await user.signer.nip04.decrypt(event.pubkey, roomTag);
            } catch {
              roomId = roomTag; // Fallback to unencrypted
            }
          } else {
            roomId = roomTag;
          }

          const signalingEvent: WebRTCSignalingEvent = {
            id: event.id,
            pubkey: event.pubkey,
            type: typeTag as 'connect' | 'disconnect' | 'offer' | 'answer' | 'candidate' | 'kick' | 'ban',
            roomId,
            targetPubkey,
            content,
            timestamp: event.created_at,
          };

          // Call registered handlers
          const handler = eventHandlersRef.current.get(typeTag);
          if (handler) {
            handler(signalingEvent);
          }

          // Update available rooms and participant timestamps for connect events  
          if (typeTag === 'connect' && roomId) {
            // Update participant timestamp
            participantTimestampsRef.current.set(event.pubkey, Date.now());
            
            setAvailableRooms(prev => {
              const newRooms = new Map(prev);
              const existing = newRooms.get(roomId) || {
                id: roomId,
                name: `Room ${roomId.substring(0, 8)}`,
                participants: [],
                isPrivate: false,
                createdBy: event.pubkey,
                createdAt: event.created_at,
              };
              
              if (!existing.participants.includes(event.pubkey)) {
                existing.participants.push(event.pubkey);
              }
              
              newRooms.set(roomId, existing);
              return newRooms;
            });
          }

          // Remove from available rooms for disconnect events
          if (typeTag === 'disconnect' && roomId) {
            // Remove participant timestamp
            participantTimestampsRef.current.delete(event.pubkey);
            
            setAvailableRooms(prev => {
              const newRooms = new Map(prev);
              const room = newRooms.get(roomId);
              if (room) {
                room.participants = room.participants.filter(p => p !== event.pubkey);
                if (room.participants.length === 0) {
                  newRooms.delete(roomId);
                } else {
                  newRooms.set(roomId, room);
                }
              }
              return newRooms;
            });
          }

          // Handle kick events
          if (typeTag === 'kick' && targetPubkey === user.pubkey) {
            // User has been kicked - force disconnect
            toast({
              title: 'Removed from Room',
              description: event.content ? String(event.content) : 'You have been removed from the audio room.',
              variant: 'destructive',
            });
            
            // Trigger disconnect handler if registered
            const disconnectHandler = eventHandlersRef.current.get('disconnect');
            if (disconnectHandler) {
              disconnectHandler({
                ...signalingEvent,
                type: 'disconnect',
                pubkey: user.pubkey,
              });
            }
          }

          // Handle ban events
          if (typeTag === 'ban' && targetPubkey === user.pubkey) {
            // User has been banned - add to banned list and force disconnect
            setBannedUsers(prev => new Set(prev).add(user.pubkey));
            
            toast({
              title: 'Banned from Room',
              description: event.content ? String(event.content) : 'You have been banned from the audio room.',
              variant: 'destructive',
            });

            // Trigger disconnect handler if registered
            const disconnectHandler = eventHandlersRef.current.get('disconnect');
            if (disconnectHandler) {
              disconnectHandler({
                ...signalingEvent,
                type: 'disconnect',
                pubkey: user.pubkey,
              });
            }
          }

          // Update moderators list from Peachy's events
          if (event.pubkey === PEACHY_PUBKEY && typeTag === 'connect' && event.content) {
            try {
              const moderatorData = event.content as { moderators?: string[] };
              if (moderatorData.moderators) {
                setModerators(new Set([PEACHY_PUBKEY, ...moderatorData.moderators]));
              }
            } catch {
              // Ignore invalid moderator data
            }
          }

        } catch (error) {
          console.error('Failed to handle WebRTC signaling event:', error);
        }
      };

      // Process initial events
      recentEvents.forEach(handleEvent);
      
      // NRTC Pattern: Real-time subscriptions instead of polling
      // This matches NRTC's relay.sub() pattern for immediate event delivery
      const abortController = new AbortController();
      
      const filters = [
        {
          kinds: [25050],
          '#p': [user.pubkey], // Direct messages (offers/answers/candidates)
        },
        {
          kinds: [25050], 
          '#r': [PEACHY_AUDIO_ROOM.id], // Room messages (connect/disconnect)
        }
      ];

      // Start real-time subscription
      const startSubscription = async () => {
        try {
          const eventStream = nostr.req(filters, { signal: abortController.signal });
          
          for await (const msg of eventStream) {
            if (msg[0] === 'EVENT') {
              const event = msg[2];
              await handleEvent(event);
            } else if (msg[0] === 'EOSE') {
              console.log('WebRTC signaling: Now streaming live events');
            } else if (msg[0] === 'CLOSED') {
              console.log('WebRTC signaling subscription closed');
              break;
            }
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error('WebRTC signaling subscription error:', error);
          }
        }
      };

      // Start subscription in background
      startSubscription();
      
      // Start heartbeat and cleanup timers
      heartbeatIntervalRef.current = setInterval(() => {
        sendHeartbeat();
        cleanupStaleParticipants();
      }, 30000); // Every 30 seconds
      
      subscriptionRef.current = { 
        close: () => {
          abortController.abort();
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
          }
        } 
      };

    } catch (error) {
      console.error('Failed to start WebRTC signaling listener:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to start listening for audio room events.',
        variant: 'destructive',
      });
      setIsListening(false);
    }
  }, [user, isListening, nostr, decryptContent, toast, sendHeartbeat, cleanupStaleParticipants]);

  // Stop listening for events
  const stopListening = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.close();
      subscriptionRef.current = null;
    }
    setIsListening(false);
    setAvailableRooms(new Map());
    
    // Clear processed events to allow reprocessing on rejoin
    // This is important for reconnection scenarios
    processedEventsRef.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    // State
    isListening,
    connectedRooms,
    availableRooms,
    moderators,
    bannedUsers,

    // Publishing methods
    publishConnect,
    publishDisconnect,
    publishOffer,
    publishAnswer,
    publishIceCandidate,

    // Moderation methods
    isModerator,
    isUserBanned,
    kickUser,
    banUser,
    addModerator,
    removeModerator,

    // Event handling
    registerEventHandler,
    unregisterEventHandler,
    startListening,
    stopListening,

    // Utility methods
    encryptContent,
    decryptContent,
  };
}