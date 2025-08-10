import { FollowButton } from '@/components/FollowButton';
import { ZapDialog } from '@/components/ZapDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Zap, Share, Clock, MessageSquare } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { genUserName } from '@/lib/genUserName';
import { useState, useEffect } from 'react';
import type { Event } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';

// Peachy's vanity npub decoded to hex
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

interface LiveStreamToolbarProps {
  liveEvent?: NostrEvent | null;
}

export function LiveStreamToolbar({ liveEvent }: LiveStreamToolbarProps) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { mutate: publishMessage } = useNostrPublish();
  const author = useAuthor(PEACHY_PUBKEY);
  const metadata = author.data?.metadata;
  const [duration, setDuration] = useState('0:00');
  const [nostrDialogOpen, setNostrDialogOpen] = useState(false);
  const [nostrMessage, setNostrMessage] = useState('');

  // Calculate live duration
  useEffect(() => {
    if (!liveEvent) {
      setDuration('0:00');
      return;
    }

    const startTime = liveEvent.created_at * 1000; // Convert to milliseconds
    
    const updateDuration = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000); // seconds
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      setDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    // Update immediately
    updateDuration();

    // Update every second
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [liveEvent]);

  // Initialize default message for Share on Nostr
  useEffect(() => {
    if (!nostrMessage) {
      setNostrMessage('I\'m watching nostr:npub1peachy0e223un984r54xnu9k93mcjk92mp27zrl03qfmcwpwmqsqt2agsv on peachyhodl.com, come join us! https://peachyhodl.com');
    }
  }, [nostrMessage]);

  // Handle Share on Nostr
  const handleNostrShare = () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'You must be logged in to share on Nostr.',
        variant: 'destructive',
      });
      return;
    }

    publishMessage({
      kind: 1,
      content: nostrMessage,
      tags: [
        ['p', PEACHY_PUBKEY] // Mention Peachy for notification (NIP-27)
      ]
    });

    setNostrDialogOpen(false);
    toast({
      title: 'Shared on Nostr!',
      description: 'Your message has been posted to the Nostr network.',
    });
  };

  // Share functionality
  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `🔴 Peachy is live now! ${liveEvent?.content || 'Join the livestream'} ${shareUrl}`;

    if (navigator.share) {
      // Use native share API if available
      try {
        await navigator.share({
          title: 'Peachy Live Stream',
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled, do nothing
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        toast({
          title: 'Copied to clipboard',
          description: 'Livestream link copied! Share it with your friends.',
        });
      } catch (err) {
        console.error('Failed to copy:', err);
        toast({
          title: 'Share failed',
          description: 'Could not copy to clipboard. Try manually copying the URL.',
          variant: 'destructive',
        });
      }
    }
  };
  
  // Create a mock profile event for zapping Peachy (similar to About page)
  // This uses the nostr-tools Event type that ZapDialog expects
  const peachyProfileEvent: Event = {
    id: '0000000000000000000000000000000000000000000000000000000000000000', // Valid hex event ID
    pubkey: PEACHY_PUBKEY,
    created_at: Math.floor(Date.now() / 1000),
    kind: 0, // Profile metadata event
    tags: [],
    content: JSON.stringify(metadata || {}),
    sig: ''
  };

  return (
    <div className="w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:gap-4">
          {/* Top Row: Profile + Follow + Duration */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Profile Section */}
              <Avatar className="h-10 w-10">
                <AvatarImage src={metadata?.picture} alt="Peachy" />
                <AvatarFallback>{genUserName(PEACHY_PUBKEY).slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">{metadata?.display_name || metadata?.name || 'Peachy'}</span>
                {liveEvent && (
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {liveEvent.tags.find(([t]) => t === 'title')?.[1] || liveEvent.content || 'Live Stream'}
                  </span>
                )}
              </div>

              {/* Divider (hidden on mobile) */}
              <div className="hidden lg:block h-6 w-px bg-border mx-2" />

              {/* Follow Button Section */}
              <FollowButton 
                pubkey={PEACHY_PUBKEY}
                petname="Peachy"
                size="default"
                className="min-w-[100px]"
              />
            </div>

            {/* Live duration (right side on mobile) */}
            {liveEvent && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground lg:hidden">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                <Clock className="h-4 w-4" />
                <span>{duration}</span>
              </div>
            )}
          </div>

          {/* Bottom Row: Action Buttons (mobile) / Inline (desktop) */}
          <div className="flex items-center gap-2 lg:gap-4 lg:flex-1">
            {/* Divider (desktop only) */}
            <div className="hidden lg:block h-6 w-px bg-border" />

            {/* Zap Button */}
            <ZapDialog target={peachyProfileEvent}>
              <Button 
                variant="outline" 
                size="default" 
                className="min-w-[100px] flex-1 lg:flex-none"
                disabled={!user}
              >
                <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                {user ? 'Zap Peachy' : 'Sign in to Zap'}
              </Button>
            </ZapDialog>

            {/* Share Button */}
            <Button 
              variant="outline" 
              size="default" 
              onClick={handleShare}
              className="min-w-[80px] flex-1 lg:flex-none"
            >
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>

            {/* Share on Nostr Button */}
            <Dialog open={nostrDialogOpen} onOpenChange={setNostrDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="default" 
                  disabled={!user}
                  className="min-w-[120px] flex-1 lg:flex-none"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {user ? 'Share on Nostr' : 'Sign in to Share'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Share on Nostr</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="nostr-message" className="text-sm font-medium">
                      Message
                    </label>
                    <Textarea
                      id="nostr-message"
                      value={nostrMessage}
                      onChange={(e) => setNostrMessage(e.target.value)}
                      className="mt-1"
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleNostrShare} className="flex-1">
                      Post to Nostr
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setNostrDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Spacer for desktop */}
            <div className="hidden lg:block flex-1" />
            
            {/* Live duration (desktop only) */}
            {liveEvent && (
              <div className="hidden lg:flex items-center gap-1 text-sm text-muted-foreground">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                <Clock className="h-4 w-4" />
                <span>{duration}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}