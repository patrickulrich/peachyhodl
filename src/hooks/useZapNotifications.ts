import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

const PEACHY_HEX = '0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820';

export interface ZapNotification {
  id: string;
  timestamp: number;
  amount: number; // in sats
  sender: {
    pubkey: string;
    name?: string;
  };
  recipient: {
    pubkey: string;
    name?: string;
  };
  message: string;
  type: 'profile' | 'stream';
  zapRequest: NostrEvent;
  zapReceipt: NostrEvent;
  eventId?: string; // For stream zaps
}

// Parse bolt11 invoice to extract amount
function parseBolt11Amount(bolt11: string): number {
  try {
    // Simple regex to extract amount from bolt11 invoice
    // Format: lnbc{amount}{multiplier}1p{rest}
    const match = bolt11.match(/^lnbc(\d+)([munp])?1p/i);
    if (!match) return 0;
    
    const amount = parseInt(match[1]);
    const multiplier = match[2];
    
    // Convert to millisatoshi first, then to satoshi
    let milliSats = amount;
    switch (multiplier) {
      case 'm': milliSats = amount * 100_000_000; break; // milli-bitcoin
      case 'u': milliSats = amount * 100_000; break; // micro-bitcoin  
      case 'n': milliSats = amount * 100; break; // nano-bitcoin
      case 'p': milliSats = amount / 10; break; // pico-bitcoin
      default: milliSats = amount; break; // No multiplier = milli-satoshi
    }
    
    // Convert millisatoshi to satoshi
    return Math.floor(milliSats / 1000);
  } catch (error) {
    console.error('Failed to parse bolt11 amount:', error);
    return 0;
  }
}

// Extract zap request from zap receipt description
function parseZapRequest(description: string): NostrEvent | null {
  try {
    return JSON.parse(description) as NostrEvent;
  } catch (error) {
    console.error('Failed to parse zap request:', error);
    return null;
  }
}

// Convert zap receipt to notification
function convertZapReceiptToNotification(
  zapReceipt: NostrEvent,
  liveEventId?: string
): ZapNotification | null {
  try {
    // Get the description tag (contains the zap request)
    const descriptionTag = zapReceipt.tags.find(([t]) => t === 'description');
    if (!descriptionTag || !descriptionTag[1]) return null;
    
    const zapRequest = parseZapRequest(descriptionTag[1]);
    if (!zapRequest) return null;
    
    // Get bolt11 invoice
    const bolt11Tag = zapReceipt.tags.find(([t]) => t === 'bolt11');
    if (!bolt11Tag || !bolt11Tag[1]) return null;
    
    const amount = parseBolt11Amount(bolt11Tag[1]);
    
    // Get recipient (p tag from zap receipt)
    const recipientTag = zapReceipt.tags.find(([t]) => t === 'p');
    if (!recipientTag || !recipientTag[1]) return null;
    
    // Get sender (P tag from zap receipt, or pubkey from zap request)
    const senderTag = zapReceipt.tags.find(([t]) => t === 'P');
    const senderPubkey = senderTag?.[1] || zapRequest.pubkey;
    
    // Get event being zapped (e tag)
    const eventTag = zapReceipt.tags.find(([t]) => t === 'e');
    const zapEventId = eventTag?.[1];
    
    // Determine if this is a profile zap or stream zap
    const isStreamZap = zapEventId === liveEventId;
    const isPeachyZap = recipientTag[1] === PEACHY_HEX;
    
    // Only show zaps to Peachy (profile or stream)
    if (!isPeachyZap) return null;
    
    return {
      id: zapReceipt.id,
      timestamp: zapReceipt.created_at * 1000,
      amount,
      sender: {
        pubkey: senderPubkey,
      },
      recipient: {
        pubkey: recipientTag[1],
      },
      message: zapRequest.content || '',
      type: isStreamZap ? 'stream' : 'profile',
      zapRequest,
      zapReceipt,
      eventId: zapEventId,
    };
  } catch (error) {
    console.error('Failed to convert zap receipt:', error);
    return null;
  }
}

export function useZapNotifications(liveEventId?: string) {
  const { nostr } = useNostr();
  
  return useQuery({
    queryKey: ['zap-notifications', PEACHY_HEX, liveEventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const since = Math.floor(Date.now() / 1000) - (24 * 60 * 60); // Last 24 hours
      
      // Query for zap receipts (kind 9735) for Peachy
      const zapReceipts = await nostr.query([{
        kinds: [9735],
        '#p': [PEACHY_HEX], // Zaps to Peachy
        since,
        limit: 100,
      }], { signal });
      
      // Convert zap receipts to notifications
      const notifications: ZapNotification[] = [];
      
      for (const receipt of zapReceipts) {
        const notification = convertZapReceiptToNotification(receipt, liveEventId);
        if (notification) {
          notifications.push(notification);
        }
      }
      
      // Sort by timestamp (newest first)
      return notifications.sort((a, b) => b.timestamp - a.timestamp);
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    retry: 1,
  });
}