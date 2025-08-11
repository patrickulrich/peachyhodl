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
  TWITCH_CLIENT_ID,
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
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

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
            reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection

            // Set up keepalive timeout - use server-provided timeout + buffer
            const keepaliveTimeout = eventSubMessage.payload.session.keepalive_timeout_seconds || 10;
            if (keepaliveTimeoutRef.current) {
              clearTimeout(keepaliveTimeoutRef.current);
            }
            // Use server timeout + small buffer to detect dead connections quickly
            keepaliveTimeoutRef.current = setTimeout(() => {
              console.warn('Keepalive timeout exceeded, reconnecting immediately...');
              setError('Connection lost - reconnecting...');
              ws.close(); // This will trigger immediate reconnect in onclose
            }, (keepaliveTimeout + 3) * 1000); // Only 3 second buffer for faster detection

            // Create subscriptions after successful connection
            await createEventSubSubscriptions(token, sessionId);
            break;
          }

          case 'session_keepalive':
            console.log('EventSub keepalive received');
            // Clear any existing error when we receive a keepalive
            if (error === 'Connection lost - reconnecting...') {
              setError(null);
            }
            // Reset keepalive timeout - expecting another within ~10 seconds
            if (keepaliveTimeoutRef.current) {
              clearTimeout(keepaliveTimeoutRef.current);
              // Twitch sends keepalives every ~10 seconds, set timeout for 13 seconds
              keepaliveTimeoutRef.current = setTimeout(() => {
                console.warn('Keepalive timeout exceeded, reconnecting immediately...');
                setError('Connection lost - reconnecting...');
                ws.close(); // Triggers immediate reconnect
              }, 13000); // 13 seconds - should get one every 10
            }
            break;

          case 'notification': {
            console.log('EventSub notification received:', {
              type: eventSubMessage.metadata.subscription_type,
              event: eventSubMessage.payload.event
            });
            const twitchMessage = convertEventSubToTwitchMessage(eventSubMessage);
            console.log('Converted to TwitchMessage:', twitchMessage);
            if (twitchMessage) {
              setMessages(prev => {
                const updated = [...prev, twitchMessage];
                if (updated.length > 500) {
                  return updated.slice(-300);
                }
                return updated;
              });
            } else {
              console.warn('Failed to convert EventSub message to TwitchMessage');
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

        // Immediate reconnect if we were authenticated and it wasn't a manual close
        if (isAuthenticated && event.code !== 1000 && !reconnectTimeoutRef.current) {
          reconnectAttemptsRef.current++;
          
          if (reconnectAttemptsRef.current > maxReconnectAttempts) {
            setError('Failed to reconnect after multiple attempts. Please refresh the page.');
            return;
          }
          
          // Calculate delay with exponential backoff, but cap at 5 seconds
          const delay = Math.min(100 * Math.pow(2, reconnectAttemptsRef.current - 1), 5000);
          
          console.log(`Attempting reconnection (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}) in ${delay}ms...`);
          setError(`Connection lost - reconnecting (attempt ${reconnectAttemptsRef.current})...`);
          
          // Reconnect with exponential backoff
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, delay);
        }
      };

    } catch (error) {
      console.error('Failed to connect to EventSub:', error);
      setError('Failed to connect to EventSub');
    }
  }, [isAuthenticated, error]);

  const createEventSubSubscriptions = async (accessToken: string, sessionId: string) => {
    const broadcasterId = await getBroadcasterUserId(accessToken);
    if (!broadcasterId) {
      setError('Failed to get broadcaster user ID');
      return;
    }

    console.log('Creating subscriptions for broadcaster ID:', broadcasterId);

    // Get the authenticated user's info to see who is actually authenticated
    let authenticatedUser: { id?: string; login?: string; display_name?: string } | null = null;
    try {
      const userResponse = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': TWITCH_CLIENT_ID
        }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json() as { data?: Array<{ id: string; login: string; display_name: string }> };
        authenticatedUser = userData.data?.[0] || null;
        console.log('Authenticated as:', {
          id: authenticatedUser?.id,
          login: authenticatedUser?.login,
          display_name: authenticatedUser?.display_name
        });
        console.log('Target broadcaster (peachyhodl) ID:', broadcasterId);
        
        if (authenticatedUser?.login?.toLowerCase() !== 'peachyhodl') {
          console.warn('⚠️  You are not authenticated as peachyhodl! Most EventSub subscriptions will fail.');
          setError(`⚠️ Authentication Issue: You're logged in as "${authenticatedUser?.login || 'unknown'}" but need to be logged in as "peachyhodl" (the broadcaster) for most Twitch events to work. Only raids and your own chat messages will be received. Please log out and log in as peachyhodl to receive follows, bits, subscriptions, and all chat messages.`);
        }
      }
    } catch (error) {
      console.warn('Could not get authenticated user info:', error);
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
      // Chat messages (requires user_id - listen to authenticated user's messages in broadcaster's channel)  
      {
        type: 'channel.chat.message',
        version: '1',
        condition: {
          broadcaster_user_id: broadcasterId,
          user_id: authenticatedUser?.id || broadcasterId
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

      console.log(`Creating EventSub subscription: ${sub.type}`, subscription);
      const success = await createEventSubSubscription(accessToken, subscription);
      if (success) {
        console.log(`✅ Successfully created EventSub subscription: ${sub.type}`);
      } else {
        console.error(`❌ Failed to create EventSub subscription: ${sub.type}`);
        setError(`Failed to create subscription: ${sub.type}`);
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