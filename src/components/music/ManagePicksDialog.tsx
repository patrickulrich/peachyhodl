import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { MusicTrack, MusicList } from '@/hooks/useMusicLists';

interface ManagePicksDialogProps {
  currentList?: MusicList;
  currentTracks?: MusicTrack[];
  onListUpdated?: () => void;
  children: React.ReactNode;
}

export function ManagePicksDialog({ children }: ManagePicksDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Wavlake Picks</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p className="text-muted-foreground">
            Wavlake picks are now automatically curated from trending tracks on Wavlake.
          </p>
          <Button className="mt-4" onClick={() => window.open('https://wavlake.com', '_blank')}>
            Visit Wavlake
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}