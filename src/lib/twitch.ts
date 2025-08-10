// Twitch OAuth configuration
export const TWITCH_CLIENT_ID = 'whoyrkl3vhkfuaubb9iui9h84e2ys5';
export const TWITCH_CHANNEL = 'peachyhodl';

// Dynamic redirect URI based on environment
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const TWITCH_REDIRECT_URI = isDevelopment 
  ? `${window.location.protocol}//${window.location.host}/stream/chat`
  : 'https://peachyhodl.com/stream/chat';

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
  messageType?: 'chat' | 'subscription' | 'giftsub' | 'bits' | 'raid' | 'announcement' | 'follow';
  // Subscription related
  subTier?: '1000' | '2000' | '3000' | 'Prime';
  subMonths?: number;
  subMessage?: string;
  isResub?: boolean;
  // Gift sub related
  giftRecipient?: string;
  giftMonths?: number;
  giftTotal?: number;
  // Bits related
  bits?: number;
  // Raid related
  raidViewers?: number;
  raidFromChannel?: string;
  // Follow related
  isFirstTimeFollower?: boolean;
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

// Parse Twitch IRC message including special events
export function parseTwitchIRCMessage(message: string): TwitchMessage | null {
  const parts = message.match(/^(?:@([^ ]+) )?(?::([^ ]+) )?([^ ]+)(?: (.*))?$/);
  if (!parts) return null;
  
  const [, tags, source, command, params] = parts;
  
  // Handle both PRIVMSG and USERNOTICE (for special events)
  if (command !== 'PRIVMSG' && command !== 'USERNOTICE') return null;
  
  const tagsParsed = parseIRCTags(tags || '');
  const channelAndMessage = params?.match(/^#\w+ :(.*)$/);
  const messageText = channelAndMessage?.[1] || '';
  const username = source?.match(/^([^!]+)/)?.[1] || 'Unknown';
  
  // Determine message type from tags
  const msgId = tagsParsed['msg-id'];
  
  // Base message object
  const baseMessage: TwitchMessage = {
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
    isBroadcaster: tagsParsed['badges']?.includes('broadcaster') || false,
    messageType: 'chat'
  };
  
  // Handle special message types
  if (msgId) {
    switch (msgId) {
      case 'sub':
      case 'resub':
        return {
          ...baseMessage,
          messageType: 'subscription',
          isResub: msgId === 'resub',
          subTier: tagsParsed['msg-param-sub-plan'] as TwitchMessage['subTier'],
          subMonths: parseInt(tagsParsed['msg-param-cumulative-months'] || '1'),
          subMessage: messageText || tagsParsed['system-msg']?.replace(/\\s/g, ' ')
        };
        
      case 'subgift':
      case 'submysterygift':
        return {
          ...baseMessage,
          messageType: 'giftsub',
          subTier: tagsParsed['msg-param-sub-plan'] as TwitchMessage['subTier'],
          giftRecipient: tagsParsed['msg-param-recipient-display-name'] || tagsParsed['msg-param-recipient-user-name'],
          giftMonths: parseInt(tagsParsed['msg-param-gift-months'] || '1'),
          giftTotal: parseInt(tagsParsed['msg-param-sender-count'] || '0'),
          message: tagsParsed['system-msg']?.replace(/\\s/g, ' ') || 
                  `${baseMessage.displayName} gifted a sub to ${tagsParsed['msg-param-recipient-display-name']}!`
        };
        
      case 'raid':
        return {
          ...baseMessage,
          messageType: 'raid',
          raidViewers: parseInt(tagsParsed['msg-param-viewerCount'] || '0'),
          raidFromChannel: tagsParsed['msg-param-displayName'],
          message: `${tagsParsed['msg-param-displayName']} is raiding with ${tagsParsed['msg-param-viewerCount']} viewers!`
        };
        
      case 'announcement':
        return {
          ...baseMessage,
          messageType: 'announcement',
          message: messageText
        };
        
      case 'follow':
        return {
          ...baseMessage,
          messageType: 'follow',
          isFirstTimeFollower: true,
          message: tagsParsed['system-msg']?.replace(/\\s/g, ' ') || 
                  `${baseMessage.displayName} is now following!`
        };
    }
  }
  
  // Check for bits in regular messages
  if (tagsParsed['bits']) {
    return {
      ...baseMessage,
      messageType: 'bits',
      bits: parseInt(tagsParsed['bits']),
      message: messageText
    };
  }
  
  // Regular chat message
  return baseMessage;
}