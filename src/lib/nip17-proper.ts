// Proper NIP-17 implementation using NIP-59 Gift Wrapping
// This implementation follows NIP-17 and NIP-59 specifications exactly
import type { NostrEvent } from '@nostrify/nostrify';
import { generateSecretKey, getPublicKey, getEventHash, finalizeEvent, nip44 } from 'nostr-tools';

type Rumor = {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
};

const TWO_DAYS = 2 * 24 * 60 * 60;
const now = () => Math.round(Date.now() / 1000);
const randomNow = () => Math.round(now() - (Math.random() * TWO_DAYS));

export interface TrackSuggestionData {
  trackId: string;
  trackTitle: string;
  trackArtist: string;
  message: string;
}

export async function createNIP17TrackSuggestion(
  trackData: TrackSuggestionData,
  signer: { 
    getPublicKey: () => Promise<string>; 
    signEvent: (event: unknown) => Promise<NostrEvent>;
    nip44: { encrypt: (pubkey: string, message: string) => Promise<string> }; // Required for NIP-17
  },
  recipientPubkey: string,
  publishEvent: (event: unknown) => Promise<NostrEvent>
): Promise<void> {

  const senderPubkey = await signer.getPublicKey();

  // 1. Create the rumor (unsigned kind 14 event) - per NIP-17, MUST NOT be signed
  const rumor: Rumor = {
    kind: 14,
    content: formatTrackSuggestionMessage(trackData),
    tags: [
      ['p', recipientPubkey],
      ['subject', 'Track Suggestion'],
      ['t', 'track-suggestion'],
      ['track-id', trackData.trackId],
      ['track-title', trackData.trackTitle],
      ['track-artist', trackData.trackArtist],
    ],
    created_at: now(),
    pubkey: senderPubkey,
    id: '', // Will be calculated
  };

  // Calculate rumor ID
  rumor.id = getEventHash(rumor as NostrEvent);

  // 2. Create the seal (kind 13 event) - encrypts rumor and IS signed by sender
  const encryptedRumor = await signer.nip44.encrypt(recipientPubkey, JSON.stringify(rumor));

  const sealEvent = {
    kind: 13,
    content: encryptedRumor,
    created_at: randomNow(),
    tags: [], // Per NIP-59: Tags MUST always be empty in a kind:13
  };

  const signedSeal = await signer.signEvent(sealEvent);

  // 3. Create gift wraps (kind 1059) - one for recipient, one for sender
  await createAndPublishGiftWrap(signedSeal, recipientPubkey, signer, publishEvent);
  await createAndPublishGiftWrap(signedSeal, senderPubkey, signer, publishEvent); // Copy to sender
}

// Create gift wrap for a recipient
async function createAndPublishGiftWrap(
  sealEvent: NostrEvent,
  recipientPubkey: string,
  signer: { nip44: { encrypt: (pubkey: string, message: string) => Promise<string> } },
  publishEvent: (event: unknown) => Promise<NostrEvent>
): Promise<void> {
  // Generate ephemeral key for gift wrapping
  const ephemeralPrivateKey = generateSecretKey();
  const ephemeralPubkey = getPublicKey(ephemeralPrivateKey);
  
  // Encrypt the seal with ephemeral key to recipient using nostr-tools directly
  // since we need to encrypt with the ephemeral key, not the user's signer
  const conversationKey = nip44.v2.utils.getConversationKey(ephemeralPrivateKey, recipientPubkey);
  const encryptedSeal = nip44.v2.encrypt(JSON.stringify(sealEvent), conversationKey);

  const giftWrapEvent = {
    kind: 1059,
    content: encryptedSeal,
    created_at: randomNow(),
    tags: [['p', recipientPubkey]],
    pubkey: ephemeralPubkey,
  };

  // Sign with ephemeral private key using nostr-tools
  const signedGiftWrap = finalizeEvent(giftWrapEvent, ephemeralPrivateKey);

  await publishEvent(signedGiftWrap);
}


function formatTrackSuggestionMessage(trackData: TrackSuggestionData): string {
  return [
    `🎵 Track Suggestion`,
    ``,
    `**${trackData.trackTitle}**`,
    `by ${trackData.trackArtist}`,
    ``,
    `🔗 View Track: ${window.location.origin}/wavlake/${trackData.trackId}`,
    `🎧 Listen on Wavlake: https://wavlake.com/track/${trackData.trackId}`,
    ``,
    `💬 Message:`,
    trackData.message,
  ].join('\n');
}

// Function to unwrap received NIP-17 gift wraps (kind 1059 only)
export async function unwrapNIP17Message(
  event: NostrEvent,
  recipientSigner: { 
    nip44: { decrypt: (pubkey: string, content: string) => Promise<string> }; // Required for NIP-17
    getPublicKey: () => Promise<string>;
  }
): Promise<{
  trackId?: string;
  trackTitle?: string;
  trackArtist?: string;
  message: string;
  senderPubkey: string;
  createdAt: number;
} | null> {
  try {
    // Handle ONLY NIP-17 gift wraps (kind 1059)
    if (event.kind === 1059) {
      try {
        await recipientSigner.getPublicKey(); // Verify we can access the key
        
        // 1. Decrypt the gift wrap to get the seal
        // We need to try decrypting with our private key against the ephemeral public key
        // Since we can't access our private key directly, we use the signer's decrypt method
        const sealData = await recipientSigner.nip44.decrypt(event.pubkey, event.content);
        const sealEvent = JSON.parse(sealData) as NostrEvent;
        
        if (sealEvent.kind !== 13) {
          console.warn('Gift wrap did not contain a seal (kind 13)');
          return null;
        }

        // 2. Decrypt the seal to get the rumor
        const rumorData = await recipientSigner.nip44.decrypt(sealEvent.pubkey, sealEvent.content);
        const rumor = JSON.parse(rumorData) as Rumor;
        
        if (rumor.kind !== 14) {
          console.warn('Seal did not contain a rumor (kind 14)');
          return null;
        }

        // 3. Extract track suggestion data from rumor tags
        const hasTrackSuggestionTag = rumor.tags.some(([tag, value]) => 
          tag === 't' && value === 'track-suggestion'
        );
        
        if (!hasTrackSuggestionTag) {
          return null; // Not a track suggestion
        }

        const trackId = rumor.tags.find(([tag]) => tag === 'track-id')?.[1];
        const trackTitle = rumor.tags.find(([tag]) => tag === 'track-title')?.[1];
        const trackArtist = rumor.tags.find(([tag]) => tag === 'track-artist')?.[1];

        return {
          trackId,
          trackTitle,
          trackArtist,
          message: rumor.content,
          senderPubkey: rumor.pubkey,
          createdAt: rumor.created_at,
        };

      } catch (error) {
        console.warn('Failed to process NIP-17 gift wrap:', error);
        return null;
      }
    }


    // Reject non-NIP-17 events
    console.warn(`Received non-NIP-17 event of kind ${event.kind}. Only kind 1059 gift wraps are supported.`);
    return null;

  } catch (error) {
    console.error('Failed to unwrap NIP-17 message:', error);
    return null;
  }
}