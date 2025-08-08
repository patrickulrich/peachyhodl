import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import type { MusicTrack } from '@/hooks/useMusicLists';
import { MessageCircle, Music, Send, User } from 'lucide-react';

// Peachy's pubkey for sending suggestions
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

interface SuggestTrackModalProps {
  track: MusicTrack;
  children?: React.ReactNode;
  className?: string;
}

export function SuggestTrackModal({ track, children, className }: SuggestTrackModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const { toast } = useToast();

  // Create a formatted track suggestion message
  const createTrackSuggestion = (track: MusicTrack, userComment: string) => {
    const trackInfo = [
      `🎵 Track Suggestion`,
      ``,
      `**${track.title || 'Unknown Track'}**`,
      `by ${track.artist || 'Unknown Artist'}`,
    ];

    if (track.album) {
      trackInfo.push(`Album: ${track.album}`);
    }

    if (track.genre) {
      trackInfo.push(`Genre: ${track.genre}`);
    }

    // Add link to the track page on peachyhodl.com
    trackInfo.push(`🔗 View Track: ${window.location.origin}/wavlake/${track.id}`);

    if (track.urls?.[0]?.url || track.mediaUrl) {
      trackInfo.push(`🎧 Listen on Wavlake: ${track.urls?.[0]?.url || track.mediaUrl}`);
    }

    if (userComment.trim()) {
      trackInfo.push('', `💬 Comment: "${userComment.trim()}"`);
    }

    return trackInfo.join('\n');
  };

  const handleSuggest = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to suggest tracks to Peachy.',
        variant: 'destructive',
      });
      return;
    }

    if (!user.signer.nip44) {
      toast({
        title: 'Encryption Not Supported',
        description: 'Your Nostr client does not support NIP-44 encryption required for private messages.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the track suggestion message
      const messageContent = createTrackSuggestion(track, comment);
      
      // Encrypt the message content using NIP-44
      const encryptedContent = await user.signer.nip44.encrypt(PEACHY_PUBKEY, messageContent);

      // Note: According to NIP-17, kind 14 events should be sealed and gift-wrapped
      // For now, we'll send as encrypted kind 4 (NIP-04 style) for compatibility
      // TODO: Implement full NIP-17 sealing and gift wrapping
      await publishEvent({
        kind: 4, // NIP-04 encrypted direct message for compatibility
        content: encryptedContent,
        tags: [
          ['p', PEACHY_PUBKEY],
        ],
      });

      toast({
        title: 'Track Suggested!',
        description: `Your suggestion for "${track.title || 'Unknown Track'}" has been sent to Peachy.`,
      });

      // Reset form and close modal
      setComment('');
      setIsOpen(false);

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

  if (!user) {
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        className={className}
        onClick={() => {
          toast({
            title: 'Authentication Required',
            description: 'Please sign in to suggest tracks to Peachy.',
            variant: 'destructive',
          });
        }}
      >
        <MessageCircle className="h-3 w-3" />
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button 
            variant="ghost" 
            size="sm" 
            className={className}
            title="Suggest this track to Peachy"
          >
            <MessageCircle className="h-3 w-3" />
          </Button>
        )}
      </DialogTrigger>
      
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
          {/* Track Preview */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              {track.image ? (
                <img
                  src={track.image}
                  alt={track.title || 'Track artwork'}
                  className="w-12 h-12 rounded object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Music className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">
                  {track.title || 'Unknown Track'}
                </h4>
                <p className="text-sm text-muted-foreground truncate">
                  {track.artist || 'Unknown Artist'}
                </p>
                {track.album && (
                  <p className="text-xs text-muted-foreground truncate">
                    {track.album}
                  </p>
                )}
              </div>

              {track.genre && (
                <Badge variant="outline" className="text-xs">
                  {track.genre}
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Message to Peachy */}
          <div className="space-y-2">
            <Label htmlFor="comment">Optional Message to Peachy</Label>
            <Textarea
              id="comment"
              placeholder="Why do you think Peachy should add this track? Any context or thoughts..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Recipient Info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>This suggestion will be sent privately to Peachy using encrypted messaging</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSuggest}
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-3 w-3" />
                Send Suggestion
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}