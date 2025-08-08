import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle } from 'lucide-react';
import type { MusicTrack } from '@/hooks/useMusicLists';
import { createNIP17TrackSuggestion, type TrackSuggestionData } from '@/lib/nip17-proper';
import type { NostrEvent } from '@nostrify/nostrify';

// Peachy's pubkey - who will receive the suggestions
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

interface SuggestTrackModalControlledProps {
  track: MusicTrack | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuggestTrackModalControlled({ track, open, onOpenChange }: SuggestTrackModalControlledProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const { toast } = useToast();

  // Reset comment when modal closes
  useEffect(() => {
    if (!open) {
      setComment('');
    }
  }, [open]);


  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to suggest tracks to Peachy.',
        variant: 'destructive',
      });
      return;
    }

    if (!track) {
      toast({
        title: 'No Track Selected',
        description: 'Please select a track to suggest.',
        variant: 'destructive',
      });
      return;
    }

    if (!comment.trim()) {
      toast({
        title: 'Message Required',
        description: 'Please add a message explaining why you recommend this track.',
        variant: 'destructive',
      });
      return;
    }

    if (!user.signer.nip44) {
      toast({
        title: 'NIP-44 Encryption Required',
        description: 'Your Nostr client must support NIP-44 encryption for private messaging. Please update your extension or use a compatible client.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare track suggestion data
      const trackSuggestionData: TrackSuggestionData = {
        trackId: track.id,
        trackTitle: track.title || 'Unknown Track',
        trackArtist: track.artist || 'Unknown Artist',
        message: comment.trim(),
      };

      // Create and send NIP-17 encrypted message with proper sealing and gift wrapping
      await createNIP17TrackSuggestion(
        trackSuggestionData,
        user.signer as { 
          getPublicKey: () => Promise<string>; 
          signEvent: (event: unknown) => Promise<NostrEvent>;
          nip44: { encrypt: (pubkey: string, message: string) => Promise<string> }; 
        }, // Type assertion since we already checked nip44 exists
        PEACHY_PUBKEY,
        publishEvent
      );

      toast({
        title: 'Track Suggested!',
        description: `Your suggestion for "${track.title || 'Unknown Track'}" has been sent to Peachy.`,
      });

      onOpenChange(false);
      setComment('');
    } catch (error) {
      console.error('Failed to suggest track:', error);
      toast({
        title: 'Failed to Send',
        description: 'Could not send track suggestion. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!track) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Suggest Track to Peachy
          </DialogTitle>
          <DialogDescription>
            Send a private message to Peachy suggesting this track for the playlist.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Track preview */}
          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-center gap-3">
              {track.image && (
                <img 
                  src={track.image} 
                  alt={track.title || 'Track artwork'}
                  className="w-12 h-12 rounded object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{track.title || 'Unknown Track'}</h4>
                <p className="text-sm text-muted-foreground truncate">
                  {track.artist || 'Unknown Artist'}
                  {track.album && ` • ${track.album}`}
                </p>
              </div>
            </div>
          </div>

          {/* Comment input */}
          <div className="space-y-2">
            <Label htmlFor="comment">
              Why do you recommend this track? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="comment"
              placeholder="Tell Peachy why this track would be perfect for the weekly picks..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px]"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Your message will be sent privately via Nostr (NIP-17).
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !comment.trim()}
          >
            {isSubmitting ? 'Sending...' : 'Send Suggestion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}