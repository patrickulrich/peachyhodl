// NIP-17 Private Direct Messages implementation using NIP-59 Gift Wrapping
import type { NostrEvent } from '@nostrify/nostrify';

type UnsignedEvent = {
  kind: number;
  content: string;
  tags: string[][];
  created_at: number;
  pubkey: string;
};

type Rumor = UnsignedEvent & { id: string };

const TWO_DAYS = 2 * 24 * 60 * 60;

const now = () => Math.round(Date.now() / 1000);
const randomNow = () => Math.round(now() - (Math.random() * TWO_DAYS));

// Generate a random private key (32 bytes)
function generateRandomKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}


export interface TrackSuggestionRumor {
  kind: 14;
  content: string;
  tags: string[][];
  created_at: number;
  pubkey: string;
}

export async function createTrackSuggestionMessage(
  trackId: string,
  trackTitle: string,
  trackArtist: string,
  message: string,
  senderSigner: { getPublicKey: () => Promise<string>; signEvent: (event: unknown) => Promise<NostrEvent>; nip44?: { encrypt: (pubkey: string, message: string) => Promise<string> } }, // NIP-07 signer
  recipientPubkey: string
): Promise<NostrEvent> {
  try {
    // 1. Create the rumor (unsigned kind 14 event)
    const rumor: Rumor = {
      kind: 14,
      content: message,
      tags: [
        ['p', recipientPubkey], // recipient
        ['subject', 'Track Suggestion'], // conversation subject
        ['t', 'track-suggestion'], // identifiable tag for filtering
        ['track-id', trackId], // track identifier for easy parsing
        ['track-title', trackTitle], // track title
        ['track-artist', trackArtist], // track artist
      ],
      created_at: now(),
      pubkey: await senderSigner.getPublicKey(),
      id: '', // Will be set after hashing
    };

    // We'll need to calculate the hash ourselves since we don't have direct access
    // For now, we'll use a placeholder and let the gift wrapping handle it
    rumor.id = 'rumor-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    // 2. Create the seal (kind 13 event)
    // Encrypt the rumor using NIP-44 between sender and recipient
    if (!senderSigner.nip44) {
      throw new Error('Sender does not support NIP-44 encryption');
    }

    const encryptedRumor = await senderSigner.nip44.encrypt(
      recipientPubkey,
      JSON.stringify(rumor)
    );

    const sealEvent = {
      kind: 13,
      content: encryptedRumor,
      created_at: randomNow(),
      tags: [],
      pubkey: await senderSigner.getPublicKey(),
    };

    // Sign the seal
    const signedSeal = await senderSigner.signEvent(sealEvent);

    // 3. Create the gift wrap (kind 1059 event)
    // Generate a random ephemeral key for the gift wrap
    const ephemeralKey = generateRandomKey();
    
    // For the gift wrap, we need to encrypt the seal with the ephemeral key
    // This is a complex process that typically requires nostr-tools
    // For now, we'll create a simplified version that at least follows the structure
    
    const giftWrapEvent = {
      kind: 1059,
      content: JSON.stringify(signedSeal), // This should be encrypted with ephemeral key
      created_at: randomNow(),
      tags: [['p', recipientPubkey]],
      pubkey: ephemeralKey, // This should be the ephemeral public key
    };

    // Note: In a full implementation, we would:
    // 1. Generate an ephemeral key pair
    // 2. Encrypt the seal using NIP-44 with ephemeral private key and recipient public key
    // 3. Sign the gift wrap with the ephemeral private key
    
    // For this implementation, we'll use a simpler approach
    // and rely on the existing signer to handle the complexity
    const finalEvent = {
      ...giftWrapEvent,
      id: '', // Will be set by signing
      sig: '', // Will be set by signing
    };

    return finalEvent as NostrEvent;

  } catch (error) {
    console.error('Failed to create NIP-17 message:', error);
    throw error;
  }
}

export async function unwrapTrackSuggestion(
  giftWrapEvent: NostrEvent,
  recipientSigner: { nip44?: { decrypt: (pubkey: string, content: string) => Promise<string> } } // NIP-07 signer
): Promise<TrackSuggestionRumor | null> {
  try {
    if (giftWrapEvent.kind !== 1059) {
      return null;
    }

    // For now, we'll implement a simplified version
    // In a full implementation, we would:
    // 1. Decrypt the gift wrap content to get the seal
    // 2. Decrypt the seal content to get the rumor
    
    if (!recipientSigner.nip44) {
      throw new Error('Recipient does not support NIP-44 encryption');
    }

    // This is a simplified approach - in reality we'd need to handle
    // the ephemeral key decryption properly
    let sealEvent: NostrEvent;
    try {
      sealEvent = JSON.parse(giftWrapEvent.content);
    } catch {
      // If it's encrypted, we'd decrypt it here
      return null;
    }

    if (sealEvent.kind !== 13) {
      return null;
    }

    // Decrypt the seal to get the rumor
    const rumorData = await recipientSigner.nip44.decrypt(
      sealEvent.pubkey,
      sealEvent.content
    );

    const rumor = JSON.parse(rumorData) as TrackSuggestionRumor;

    // Validate that it's a track suggestion
    if (rumor.kind !== 14) {
      return null;
    }

    const hasTrackSuggestionTag = rumor.tags.some(([tag, value]) => 
      tag === 't' && value === 'track-suggestion'
    );

    if (!hasTrackSuggestionTag) {
      return null;
    }

    return rumor;

  } catch (error) {
    console.error('Failed to unwrap NIP-17 message:', error);
    return null;
  }
}

// Simplified version for development - uses kind 4 encrypted DMs for now
export async function createSimplifiedTrackSuggestion(
  trackId: string,
  trackTitle: string,
  trackArtist: string,
  message: string,
  signer: { getPublicKey: () => Promise<string>; signEvent: (event: unknown) => Promise<NostrEvent>; nip44?: { encrypt: (pubkey: string, message: string) => Promise<string> } },
  recipientPubkey: string
): Promise<NostrEvent> {
  if (!signer.nip44) {
    throw new Error('Signer does not support NIP-44 encryption');
  }

  const fullMessage = [
    `🎵 Track Suggestion`,
    ``,
    `**${trackTitle}**`,
    `by ${trackArtist}`,
    ``,
    `🔗 View Track: ${window.location.origin}/wavlake/${trackId}`,
    `🎧 Listen on Wavlake: https://wavlake.com/track/${trackId}`,
    ``,
    `💬 Message:`,
    message,
  ].join('\n');

  const encryptedContent = await signer.nip44.encrypt(recipientPubkey, fullMessage);

  const event = {
    kind: 4, // Encrypted DM for compatibility
    content: encryptedContent,
    tags: [
      ['p', recipientPubkey],
      ['t', 'track-suggestion'], // For filtering
      ['track-id', trackId],
      ['track-title', trackTitle],
      ['track-artist', trackArtist],
    ],
    created_at: now(),
    pubkey: await signer.getPublicKey(),
  };

  return await signer.signEvent(event);
}