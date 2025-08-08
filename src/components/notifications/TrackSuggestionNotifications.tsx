import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTrackSuggestionNotifications, useUnreadSuggestionsCount } from '@/hooks/useTrackSuggestionNotifications';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { genUserName } from '@/lib/genUserName';
import { Bell, Music, User, Clock } from 'lucide-react';

// Peachy's pubkey
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

export function TrackSuggestionNotifications() {
  const { user } = useCurrentUser();
  const { data: suggestions = [] } = useTrackSuggestionNotifications();
  const unreadCount = useUnreadSuggestionsCount();
  const [isOpen, setIsOpen] = useState(false);
  
  const isPeachy = user?.pubkey === PEACHY_PUBKEY;
  
  // Only show for Peachy
  if (!isPeachy) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Music className="h-4 w-4" />
          Track Suggestions
          {unreadCount > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {unreadCount} new
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {suggestions.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No track suggestions yet
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            {suggestions.map((suggestion) => (
              <TrackSuggestionItem
                key={suggestion.id}
                suggestion={suggestion}
                onClose={() => setIsOpen(false)}
              />
            ))}
          </ScrollArea>
        )}
        
        {suggestions.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center justify-center">
              <Link to="/track-suggestions" className="text-sm text-muted-foreground hover:text-foreground">
                View all suggestions
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface TrackSuggestionItemProps {
  suggestion: {
    id: string;
    trackId: string;
    trackTitle: string;
    trackArtist: string;
    senderPubkey: string;
    message: string;
    createdAt: number;
    isRead: boolean;
  };
  onClose: () => void;
}

function TrackSuggestionItem({ suggestion, onClose }: TrackSuggestionItemProps) {
  const author = useAuthor(suggestion.senderPubkey);
  const senderName = author.data?.metadata?.name || 
                     author.data?.metadata?.display_name || 
                     genUserName(suggestion.senderPubkey);

  const formatTimeAgo = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <DropdownMenuItem className="p-3 cursor-pointer" asChild>
      <Link to={`/wavlake/${suggestion.trackId}`} onClick={onClose}>
        <div className="flex items-start gap-3 w-full">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <Music className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {suggestion.trackTitle}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  by {suggestion.trackArtist}
                </p>
              </div>
              {!suggestion.isRead && (
                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="truncate max-w-20">{senderName}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatTimeAgo(suggestion.createdAt)}</span>
              </div>
            </div>
            {suggestion.message && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {suggestion.message.split('\n')[0]} {/* Show first line of message */}
              </p>
            )}
          </div>
        </div>
      </Link>
    </DropdownMenuItem>
  );
}