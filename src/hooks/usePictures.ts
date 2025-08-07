import { useQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import type { NostrEvent } from "@nostrify/nostrify";

// Peachy's vanity npub decoded to hex
// npub1peachy0e223un984r54xnu9k93mcjk92mp27zrl03qfmcwpwmqsqt2agsv
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

export interface PictureData {
  event: NostrEvent;
  title: string | null;
  description: string;
  images: Array<{
    url: string;
    blurhash?: string;
    dimensions?: string;
    alt?: string;
    mimeType?: string;
  }>;
  tags: string[];
  location?: string;
}

export function usePictures(limit = 20) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ["pictures", PEACHY_PUBKEY, limit],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      // Query for Peachy's picture events (kind: 20)
      const events = await nostr.query(
        [
          {
            kinds: [20],
            authors: [PEACHY_PUBKEY],
            limit,
          },
        ],
        { signal }
      );

      // Transform events into PictureData format
      return events
        .sort((a, b) => b.created_at - a.created_at)
        .map((event): PictureData => {
          const titleTag = event.tags.find(([tag]) => tag === "title");
          const locationTag = event.tags.find(([tag]) => tag === "location");
          
          // Extract all imeta tags for images
          const images = event.tags
            .filter(([tag]) => tag === "imeta")
            .map((tag) => {
              const params = tag.slice(1); // Remove "imeta" from the tag
              const imageData: PictureData["images"][0] = {
                url: "",
              };
              
              params.forEach((param) => {
                // Each param is in format "key value"
                const spaceIndex = param.indexOf(" ");
                if (spaceIndex === -1) return;
                
                const key = param.substring(0, spaceIndex);
                const value = param.substring(spaceIndex + 1);
                
                switch (key) {
                  case "url":
                    imageData.url = value;
                    break;
                  case "blurhash":
                    imageData.blurhash = value;
                    break;
                  case "dim":
                    imageData.dimensions = value;
                    break;
                  case "alt":
                    imageData.alt = value;
                    break;
                  case "m":
                    imageData.mimeType = value;
                    break;
                }
              });
              
              return imageData;
            })
            .filter((img) => img.url); // Filter out images without URLs

          // Extract hashtags
          const hashtags = event.tags
            .filter(([tag]) => tag === "t")
            .map(([_, value]) => value);

          return {
            event,
            title: titleTag ? titleTag[1] : null,
            description: event.content,
            images,
            tags: hashtags,
            location: locationTag ? locationTag[1] : undefined,
          };
        })
        .filter((picture) => picture.images.length > 0); // Only return events with images
    },
  });
}