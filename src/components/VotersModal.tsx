import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { nip19 } from 'nostr-tools';
import { Users } from 'lucide-react';

interface VoterItemProps {
  pubkey: string;
}

function VoterItem({ pubkey }: VoterItemProps) {
  const { data: author, isLoading } = useAuthor(pubkey);
  const metadata = author?.metadata;
  const displayName = metadata?.name || genUserName(pubkey);
  const npub = nip19.npubEncode(pubkey);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    );
  }

  return (
    <Link
      to={`/${npub}`}
      className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors"
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={metadata?.picture} alt={displayName} />
        <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{displayName}</p>
        {metadata?.nip05 && (
          <p className="text-sm text-muted-foreground truncate">{metadata.nip05}</p>
        )}
      </div>
    </Link>
  );
}

interface VotersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackTitle: string;
  trackArtist: string;
  voters: string[];
}

export function VotersModal({
  open,
  onOpenChange,
  trackTitle,
  trackArtist,
  voters,
}: VotersModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Voters for Track
          </DialogTitle>
          <DialogDescription className="space-y-1">
            <p className="font-medium text-foreground">{trackTitle}</p>
            <p className="text-sm">by {trackArtist}</p>
            <p className="text-sm mt-2">
              {voters.length} {voters.length === 1 ? 'person has' : 'people have'} voted for this track
            </p>
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-1">
            {voters.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No votes yet for this track
              </p>
            ) : (
              voters.map((pubkey) => (
                <VoterItem key={pubkey} pubkey={pubkey} />
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}