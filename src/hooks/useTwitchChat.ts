import { useEffect, useState, useRef, useCallback } from 'react';
import { 
  TwitchMessage, 
  parseTwitchIRCMessage, 
  parseTwitchToken, 
  clearTwitchToken,
  TWITCH_CHANNEL 
} from '@/lib/twitch';

interface UseTwitchChatReturn {
  messages: TwitchMessage[];
  isConnected: boolean;
  isAuthenticated: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  clearAuth: () => void;
}

export function useTwitchChat(): UseTwitchChatReturn {
  const [messages, setMessages] = useState<TwitchMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
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

    // Connect to Twitch IRC
    const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to Twitch IRC');
      setIsConnected(true);
      setError(null);

      // Authenticate with OAuth token
      ws.send(`PASS oauth:${token}`);
      ws.send(`NICK justinfan${Math.floor(Math.random() * 100000)}`);
      ws.send(`JOIN #${TWITCH_CHANNEL}`);
      ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');

      // Set up ping interval to keep connection alive
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('PING :tmi.twitch.tv');
        }
      }, 60000); // Ping every minute
    };

    ws.onmessage = (event) => {
      const lines = event.data.split('\r\n');
      
      for (const line of lines) {
        if (!line) continue;

        // Handle PING
        if (line.startsWith('PING')) {
          ws.send('PONG :tmi.twitch.tv');
          continue;
        }

        // Parse message
        const message = parseTwitchIRCMessage(line);
        if (message) {
          setMessages(prev => {
            // Keep only last 500 messages
            const updated = [...prev, message];
            if (updated.length > 500) {
              return updated.slice(-300);
            }
            return updated;
          });
        }
      }
    };

    ws.onerror = (event) => {
      console.error('Twitch WebSocket error:', event);
      setError('Connection error occurred');
    };

    ws.onclose = () => {
      console.log('Disconnected from Twitch IRC');
      setIsConnected(false);
      wsRef.current = null;

      // Clear ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      // Attempt to reconnect after 5 seconds if we were authenticated
      if (isAuthenticated && !reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, 5000);
      }
    };
  }, [isAuthenticated]);

  const disconnect = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clear ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const clearAuth = useCallback(() => {
    disconnect();
    clearTwitchToken();
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