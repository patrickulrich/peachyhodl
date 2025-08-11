import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { MusicTrack } from '@/hooks/useMusicLists';
import { Plus, Loader2 } from 'lucide-react';

// Peachy's pubkey
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

interface AddToPlaylistButtonProps {
  track: MusicTrack;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function AddToPlaylistButton({ 
  track, 
  className, 
  variant = "default", 
  size = "default" 
}: AddToPlaylistButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isPeachy = user?.pubkey === PEACHY_PUBKEY;

  // Don't show this button if user isn't Peachy
  if (!isPeachy) {
    return null;
  }

  const handleAddToPlaylist = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to add tracks to your playlist.',
        variant: 'destructive',
      });
      return;
    }

    setIsAdding(true);

    try {
      const { addTrackToPicksSimple } = await import('@/lib/addTrackToPicks');
      
      const success = await addTrackToPicksSimple(
        track,
        publishEvent,
        toast,
        queryClient
      );

      if (success) {
        toast({
          title: 'Track Added!',
          description: `"${track.title || 'Unknown Track'}" has been added to your weekly picks.`,
        });
      }
    } catch (error) {
      console.error('Failed to add track to playlist:', error);
      toast({
        title: 'Failed to Add Track',
        description: 'Could not add track to your picks. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Button
      onClick={handleAddToPlaylist}
      disabled={isAdding}
      className={className}
      variant={variant}
      size={size}
    >
      {isAdding ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Adding...
        </>
      ) : (
        <>
          <Plus className="h-4 w-4 mr-2" />
          Add to Weekly Picks
        </>
      )}
    </Button>
  );
}