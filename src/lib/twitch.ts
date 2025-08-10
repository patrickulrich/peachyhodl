// Twitch OAuth configuration
export const TWITCH_CLIENT_ID = 'whoyrkl3vhkfuaubb9iui9h84e2ys5';
export const TWITCH_REDIRECT_URI = 'https://peachyhodl.com/stream/chat';
export const TWITCH_CHANNEL = 'peachyhodl';

// For local development
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
if (isDevelopment) {
  // Override redirect URI for local development
  Object.defineProperty(exports, 'TWITCH_REDIRECT_URI', {
    value: `${window.location.protocol}//${window.location.host}/stream/chat`
  });
}

export interface TwitchMessage {
  id: string;
  username: string;
  displayName: string;
  message: string;
  timestamp: number;
  color?: string;
  badges?: string[];
  emotes?: Record<string, string[]>;
  isMod?: boolean;
  isSubscriber?: boolean;
  isVip?: boolean;
  isBroadcaster?: boolean;
}

export function getTwitchAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    redirect_uri: TWITCH_REDIRECT_URI,
    response_type: 'token',
    scope: 'chat:read chat:edit'
  });
  
  return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
}

export function parseTwitchToken(): string | null {
  // Check URL hash for token (Twitch uses implicit flow)
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  
  if (token) {
    // Store token in localStorage
    localStorage.setItem('twitch_token', token);
    // Clean up URL
    window.history.replaceState(null, '', window.location.pathname);
    return token;
  }
  
  // Check localStorage for existing token
  return localStorage.getItem('twitch_token');
}

export function clearTwitchToken(): void {
  localStorage.removeItem('twitch_token');
}

// Parse IRC message tags
export function parseIRCTags(tags: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  if (!tags) return parsed;
  
  const pairs = tags.split(';');
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value !== undefined) {
      parsed[key] = value;
    }
  }
  
  return parsed;
}

// Parse Twitch IRC message
export function parseTwitchIRCMessage(message: string): TwitchMessage | null {
  const parts = message.match(/^(?:@([^ ]+) )?(?::([^ ]+) )?([^ ]+)(?: (.*))?$/);
  if (!parts) return null;
  
  const [, tags, source, command, params] = parts;
  
  if (command !== 'PRIVMSG') return null;
  
  const tagsParsed = parseIRCTags(tags || '');
  const channelAndMessage = params?.match(/^#\w+ :(.*)$/);
  if (!channelAndMessage) return null;
  
  const messageText = channelAndMessage[1];
  const username = source?.match(/^([^!]+)/)?.[1] || 'Unknown';
  
  return {
    id: tagsParsed['id'] || Math.random().toString(36),
    username,
    displayName: tagsParsed['display-name'] || username,
    message: messageText,
    timestamp: parseInt(tagsParsed['tmi-sent-ts'] || Date.now().toString()),
    color: tagsParsed['color'],
    badges: tagsParsed['badges']?.split(',') || [],
    isMod: tagsParsed['mod'] === '1',
    isSubscriber: tagsParsed['subscriber'] === '1',
    isVip: tagsParsed['vip'] === '1',
    isBroadcaster: tagsParsed['badges']?.includes('broadcaster') || false
  };
}