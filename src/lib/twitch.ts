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
  messageType?: 'chat' | 'subscription' | 'giftsub' | 'bits' | 'raid' | 'announcement' | 'follow' | 'zap';
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
  // Zap related
  satoshis?: number;
  zapType?: 'profile' | 'stream';
}

export function getTwitchAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    redirect_uri: TWITCH_REDIRECT_URI,
    response_type: 'token',
    scope: 'chat:read chat:edit user:read:chat moderator:read:followers bits:read channel:read:subscriptions'
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

// EventSub WebSocket session management
export function storeTwitchSession(sessionId: string): void {
  localStorage.setItem('twitch_eventsub_session', sessionId);
}

export function getTwitchSession(): string | null {
  return localStorage.getItem('twitch_eventsub_session');
}

export function clearTwitchSession(): void {
  localStorage.removeItem('twitch_eventsub_session');
}

// Get broadcaster user ID (needed for EventSub subscriptions)
export async function getBroadcasterUserId(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.twitch.tv/helix/users?login=' + TWITCH_CHANNEL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': TWITCH_CLIENT_ID
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch broadcaster user ID:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.data?.[0]?.id || null;
  } catch (error) {
    console.error('Error fetching broadcaster user ID:', error);
    return null;
  }
}

// EventSub subscription types
export interface EventSubSubscription {
  type: string;
  version: string;
  condition: Record<string, string>;
  transport: {
    method: 'websocket';
    session_id: string;
  };
}

// Create EventSub subscription
export async function createEventSubSubscription(
  accessToken: string,
  subscription: EventSubSubscription
): Promise<boolean> {
  try {
    const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': TWITCH_CLIENT_ID,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscription)
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to create EventSub subscription:', {
        status: response.status,
        statusText: response.statusText,
        error,
        subscription
      });
      return false;
    }
    
    const result = await response.json();
    console.log('EventSub subscription created successfully:', result);
    
    return true;
  } catch (error) {
    console.error('Error creating EventSub subscription:', error);
    return false;
  }
}

// EventSub message types
export interface EventSubMessage {
  metadata: {
    message_id: string;
    message_type: 'session_welcome' | 'session_keepalive' | 'notification' | 'session_reconnect' | 'revocation';
    message_timestamp: string;
    subscription_type?: string;
    subscription_version?: string;
  };
  payload: {
    session?: {
      id: string;
      keepalive_timeout_seconds?: number;
      reconnect_url?: string;
    };
    event?: Record<string, unknown>;
    subscription?: {
      type: string;
      version: string;
      condition: Record<string, string>;
      transport: {
        method: string;
        session_id: string;
      };
      created_at: string;
    };
  };
}

// Parse EventSub WebSocket message
export function parseEventSubMessage(data: string): EventSubMessage | null {
  try {
    return JSON.parse(data) as EventSubMessage;
  } catch (error) {
    console.error('Failed to parse EventSub message:', error);
    return null;
  }
}

// Convert EventSub notification to TwitchMessage
export function convertEventSubToTwitchMessage(message: EventSubMessage): TwitchMessage | null {
  if (message.metadata.message_type !== 'notification' || !message.payload.event) return null;
  
  const { subscription_type } = message.metadata;
  const event = message.payload.event as Record<string, unknown>;
  
  const baseId = message.metadata.message_id;
  const timestamp = new Date(message.metadata.message_timestamp).getTime();
  
  switch (subscription_type) {
    case 'channel.follow':
      return {
        id: baseId,
        username: String(event.user_login || 'unknown'),
        displayName: String(event.user_name || 'Unknown'),
        message: `${String(event.user_name || 'Unknown')} is now following!`,
        timestamp,
        messageType: 'follow',
        isFirstTimeFollower: true
      };
      
    case 'channel.cheer': {
      const isAnonymous = Boolean(event.is_anonymous);
      const bits = Number(event.bits || 0);
      const username = isAnonymous ? 'anonymous' : String(event.user_login || 'anonymous');
      const displayName = isAnonymous ? 'Anonymous' : String(event.user_name || 'Anonymous');
      const message = String(event.message || '');
      
      return {
        id: baseId,
        username,
        displayName,
        message: message || `Cheered ${bits} bits!`,
        timestamp,
        messageType: 'bits',
        bits
      };
    }
      
    case 'channel.subscribe':
      return {
        id: baseId,
        username: String(event.user_login || 'unknown'),
        displayName: String(event.user_name || 'Unknown'),
        message: `${String(event.user_name || 'Unknown')} subscribed!`,
        timestamp,
        messageType: 'subscription',
        isResub: false,
        subTier: String(event.tier) === '1000' ? '1000' : String(event.tier) === '2000' ? '2000' : String(event.tier) === '3000' ? '3000' : 'Prime',
        subMonths: 1
      };
      
    case 'channel.subscription.message': {
      const messageObj = event.message as { text?: string } | undefined;
      return {
        id: baseId,
        username: String(event.user_login || 'unknown'),
        displayName: String(event.user_name || 'Unknown'),
        message: messageObj?.text || `${String(event.user_name || 'Unknown')} resubscribed!`,
        timestamp,
        messageType: 'subscription',
        isResub: true,
        subTier: String(event.tier) === '1000' ? '1000' : String(event.tier) === '2000' ? '2000' : String(event.tier) === '3000' ? '3000' : 'Prime',
        subMonths: Number(event.cumulative_months || 1)
      };
    }
      
    case 'channel.subscription.gift': {
      const total = Number(event.total || 1);
      return {
        id: baseId,
        username: String(event.user_login || 'anonymous'),
        displayName: String(event.user_name || 'Anonymous'),
        message: `${String(event.user_name || 'Anonymous')} gifted ${total} sub${total > 1 ? 's' : ''} to the community!`,
        timestamp,
        messageType: 'giftsub',
        subTier: String(event.tier) === '1000' ? '1000' : String(event.tier) === '2000' ? '2000' : String(event.tier) === '3000' ? '3000' : 'Prime',
        giftTotal: total,
        giftMonths: 1
      };
    }
      
    case 'channel.raid': {
      const viewers = Number(event.viewers || 0);
      const fromName = String(event.from_broadcaster_user_name || 'Unknown');
      return {
        id: baseId,
        username: String(event.from_broadcaster_user_login || 'unknown'),
        displayName: fromName,
        message: `${fromName} is raiding with ${viewers} viewers!`,
        timestamp,
        messageType: 'raid',
        raidViewers: viewers,
        raidFromChannel: fromName
      };
    }
      
    case 'channel.chat.message': {
      const messageObj = event.message as { text?: string } | undefined;
      const badgesArray = Array.isArray(event.badges) 
        ? (event.badges as Array<{ set_id?: string }>).map(b => b.set_id || '').filter(Boolean)
        : [];
      
      return {
        id: baseId,
        username: String(event.chatter_user_login || 'unknown'),
        displayName: String(event.chatter_user_name || 'Unknown'),
        message: messageObj?.text || '',
        timestamp,
        messageType: 'chat',
        color: String(event.color || ''),
        badges: badgesArray,
        isMod: badgesArray.includes('moderator'),
        isSubscriber: badgesArray.includes('subscriber'),
        isVip: badgesArray.includes('vip'),
        isBroadcaster: badgesArray.includes('broadcaster')
      };
    }
      
    default:
      console.log('Unknown EventSub subscription type:', subscription_type);
      return null;
  }
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