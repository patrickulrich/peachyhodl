import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useTrackSuggestionNotifications } from '@/hooks/useTrackSuggestionNotifications';
import { useNotificationReadStatus } from '@/hooks/useNotificationReadStatus';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { genUserName } from '@/lib/genUserName';
import { ArrowLeft, Bell, Music, User, Clock, ExternalLink } from 'lucide-react';

// Peachy's pubkey
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

export function NotificationsPage() {
  const { user } = useCurrentUser();
  const { data: suggestions = [] } = useTrackSuggestionNotifications();
  const { markAsRead } = useNotificationReadStatus();
  
  const isPeachy = user?.pubkey === PEACHY_PUBKEY;

  if (!isPeachy) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">This page is only available to Peachy.</p>
          <Button asChild className="mt-4">
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleMarkAsRead = (notificationIds: string[]) => {
    markAsRead(notificationIds);
  };

  const handleMarkAllAsRead = () => {
    const unreadIds = suggestions.filter(s => !s.isRead).map(s => s.id);
    if (unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Track Suggestions
            </h1>
            <p className="text-muted-foreground">
              All track suggestions sent to Peachy
            </p>
          </div>
        </div>
        
        {suggestions.some(s => !s.isRead) && (
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Notifications */}
      {suggestions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No track suggestions yet</h3>
            <p className="text-muted-foreground">
              Track suggestions will appear here when users send them via the suggest feature.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <NotificationCard
              key={suggestion.id}
              suggestion={suggestion}
              onMarkAsRead={() => handleMarkAsRead([suggestion.id])}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface NotificationCardProps {
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
  onMarkAsRead: () => void;
}

function NotificationCard({ suggestion, onMarkAsRead }: NotificationCardProps) {
  const author = useAuthor(suggestion.senderPubkey);
  const senderName = author.data?.metadata?.name || 
                     author.data?.metadata?.display_name || 
                     genUserName(suggestion.senderPubkey);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMarkAsRead();
  };

  return (
    <Card className={`transition-colors ${!suggestion.isRead ? 'bg-muted/30 border-primary/20' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Music className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {suggestion.trackTitle}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                by {suggestion.trackArtist}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!suggestion.isRead && (
              <>
                <Badge variant="secondary">New</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAsRead}
                  className="text-xs"
                >
                  Mark as Read
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Sender and Date */}
        <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span>From {senderName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatDate(suggestion.createdAt)}</span>
          </div>
        </div>

        {/* Message */}
        {suggestion.message && (
          <div className="mb-4">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {suggestion.message}
            </p>
          </div>
        )}

        <Separator className="my-4" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link to={`/wavlake/${suggestion.trackId}`}>
              <Music className="h-4 w-4 mr-2" />
              View Track
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="sm">
            <a
              href={`https://wavlake.com/track/${suggestion.trackId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open on Wavlake
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}