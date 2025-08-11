import { useEffect, useState, useRef, useCallback } from 'react';
import { 
  TwitchMessage, 
  parseTwitchToken, 
  clearTwitchToken,
  getBroadcasterUserId,
  createEventSubSubscription,
  parseEventSubMessage,
  convertEventSubToTwitchMessage,
  storeTwitchSession,
  clearTwitchSession,
  type EventSubSubscription
} from '@/lib/twitch';

interface UseTwitchEventSubReturn {
  messages: TwitchMessage[];
  isConnected: boolean;
  isAuthenticated: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  clearAuth: () => void;
}

export function useTwitchEventSub(): UseTwitchEventSubReturn {
  const [messages, setMessages] = useState<TwitchMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const keepaliveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const connect = useCallback(async () => {
    const token = parseTwitchToken();
    
    if (!token) {
      setIsAuthenticated(false);
      setError('Not authenticated with Twitch');
      return;
    }

    setIsAuthenticated(true);
    setError(null);

    // Disconnect existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      // Connect to EventSub WebSocket
      const ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to Twitch EventSub WebSocket');
      };

      ws.onmessage = async (event) => {
        const eventSubMessage = parseEventSubMessage(event.data);
        if (!eventSubMessage) return;

        const { message_type } = eventSubMessage.metadata;

        switch (message_type) {
          case 'session_welcome': {
            console.log('EventSub session welcome received');
            if (!eventSubMessage.payload.session) {
              setError('Invalid session welcome payload');
              break;
            }
            const sessionId = eventSubMessage.payload.session.id;
            sessionIdRef.current = sessionId;
            storeTwitchSession(sessionId);
            setIsConnected(true);
            setError(null);

            // Set up keepalive timeout
            const keepaliveTimeout = eventSubMessage.payload.session.keepalive_timeout_seconds || 10;
            if (keepaliveTimeoutRef.current) {
              clearTimeout(keepaliveTimeoutRef.current);
            }
            keepaliveTimeoutRef.current = setTimeout(() => {
              setError('Connection keepalive timeout');
              ws.close();
            }, (keepaliveTimeout + 5) * 1000);

            // Create subscriptions after successful connection
            await createEventSubSubscriptions(token, sessionId);
            break;
          }

          case 'session_keepalive':
            console.log('EventSub keepalive received');
            // Reset keepalive timeout
            if (keepaliveTimeoutRef.current) {
              clearTimeout(keepaliveTimeoutRef.current);
              keepaliveTimeoutRef.current = setTimeout(() => {
                setError('Connection keepalive timeout');
                ws.close();
              }, 15000); // 15 seconds for keepalive timeout
            }
            break;

          case 'notification': {
            console.log('EventSub notification:', eventSubMessage.metadata.subscription_type);
            const twitchMessage = convertEventSubToTwitchMessage(eventSubMessage);
            if (twitchMessage) {
              setMessages(prev => {
                const updated = [...prev, twitchMessage];
                if (updated.length > 500) {
                  return updated.slice(-300);
                }
                return updated;
              });
            }
            break;
          }

          case 'session_reconnect': {
            console.log('EventSub session reconnect requested');
            if (!eventSubMessage.payload.session) {
              setError('Invalid session reconnect payload');
              break;
            }
            const reconnectUrl = eventSubMessage.payload.session.reconnect_url;
            if (reconnectUrl) {
              // Close current connection and connect to new URL
              ws.close();
              const newWs = new WebSocket(reconnectUrl);
              wsRef.current = newWs;
              // The new connection will trigger onopen and session_welcome
            }
            break;
          }

          case 'revocation': {
            console.log('EventSub subscription revoked:', eventSubMessage.payload);
            const subType = eventSubMessage.payload.subscription?.type || 'unknown';
            setError(`Subscription revoked: ${subType}`);
            break;
          }

          default:
            console.log('Unknown EventSub message type:', message_type);
        }
      };

      ws.onerror = (event) => {
        console.error('EventSub WebSocket error:', event);
        setError('EventSub connection error occurred');
      };

      ws.onclose = (event) => {
        console.log('Disconnected from EventSub WebSocket:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;
        sessionIdRef.current = null;

        // Clear keepalive timeout
        if (keepaliveTimeoutRef.current) {
          clearTimeout(keepaliveTimeoutRef.current);
          keepaliveTimeoutRef.current = null;
        }

        // Attempt to reconnect after 5 seconds if we were authenticated and it wasn't a manual close
        if (isAuthenticated && event.code !== 1000 && !reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, 5000);
        }
      };

    } catch (error) {
      console.error('Failed to connect to EventSub:', error);
      setError('Failed to connect to EventSub');
    }
  }, [isAuthenticated]);

  const createEventSubSubscriptions = async (accessToken: string, sessionId: string) => {
    const broadcasterId = await getBroadcasterUserId(accessToken);
    if (!broadcasterId) {
      setError('Failed to get broadcaster user ID');
      return;
    }

    const subscriptions: Omit<EventSubSubscription, 'transport'>[] = [
      // Follow events
      {
        type: 'channel.follow',
        version: '2',
        condition: {
          broadcaster_user_id: broadcasterId,
          moderator_user_id: broadcasterId
        }
      },
      // Bits/Cheer events
      {
        type: 'channel.cheer',
        version: '1',
        condition: {
          broadcaster_user_id: broadcasterId
        }
      },
      // Subscription events
      {
        type: 'channel.subscribe',
        version: '1',
        condition: {
          broadcaster_user_id: broadcasterId
        }
      },
      // Resubscription messages
      {
        type: 'channel.subscription.message',
        version: '1',
        condition: {
          broadcaster_user_id: broadcasterId
        }
      },
      // Gift subscriptions
      {
        type: 'channel.subscription.gift',
        version: '1',
        condition: {
          broadcaster_user_id: broadcasterId
        }
      },
      // Raid events
      {
        type: 'channel.raid',
        version: '1',
        condition: {
          to_broadcaster_user_id: broadcasterId
        }
      },
      // Chat messages
      {
        type: 'channel.chat.message',
        version: '1',
        condition: {
          broadcaster_user_id: broadcasterId,
          user_id: broadcasterId
        }
      }
    ];

    // Create each subscription
    for (const sub of subscriptions) {
      const subscription: EventSubSubscription = {
        ...sub,
        transport: {
          method: 'websocket',
          session_id: sessionId
        }
      };

      const success = await createEventSubSubscription(accessToken, subscription);
      if (success) {
        console.log(`Created EventSub subscription: ${sub.type}`);
      } else {
        console.error(`Failed to create EventSub subscription: ${sub.type}`);
      }

      // Small delay between subscription requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  const disconnect = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clear keepalive timeout
    if (keepaliveTimeoutRef.current) {
      clearTimeout(keepaliveTimeoutRef.current);
      keepaliveTimeoutRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    sessionIdRef.current = null;
    setIsConnected(false);
  }, []);

  const clearAuth = useCallback(() => {
    disconnect();
    clearTwitchToken();
    clearTwitchSession();
    setIsAuthenticated(false);
    setMessages([]);
  }, [disconnect]);

  // Auto-connect on mount if authenticated
  useEffect(() => {
    const token = parseTwitchToken();
    if (token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    messages,
    isConnected,
    isAuthenticated,
    error,
    connect,
    disconnect,
    clearAuth
  };
}