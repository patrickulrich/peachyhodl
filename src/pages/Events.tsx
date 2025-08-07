import { useSeoMeta } from '@unhead/react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RelaySelector } from '@/components/RelaySelector';
import { useUpcomingLiveEvents } from '@/hooks/useLiveEvents';
import { Calendar, Clock, Radio, Users, ExternalLink, Play } from 'lucide-react';

const Events = () => {
  useSeoMeta({
    title: 'Live Events - Peachy',
    description: 'Join Peachy\'s upcoming live streams and events on Nostr.',
  });

  const { data: events, isLoading, error } = useUpcomingLiveEvents();

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'destructive'; // Red for live
      case 'planned':
        return 'default'; // Blue for planned
      default:
        return 'secondary'; // Gray for ended
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'live':
        return '🔴 LIVE';
      case 'planned':
        return '📅 Scheduled';
      case 'ended':
        return '✅ Ended';
      default:
        return status;
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
            <Radio className="h-10 w-10 text-primary" />
            Live Events
          </h1>
          <p className="text-lg text-muted-foreground">
            Join Peachy's live streams and events. All events are powered by NIP-53 on Nostr.
          </p>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex gap-2">
                      <Skeleton className="h-9 flex-1" />
                      <Skeleton className="h-9 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border-dashed">
            <CardContent className="py-12 px-8 text-center">
              <div className="max-w-sm mx-auto space-y-6">
                <p className="text-muted-foreground">
                  Failed to load live events. Try another relay?
                </p>
                <RelaySelector className="w-full" />
              </div>
            </CardContent>
          </Card>
        ) : events && events.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Card key={event.id} className={event.status === 'live' ? 'border-red-500' : ''}>
                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg leading-tight">{event.title}</CardTitle>
                    <Badge variant={getStatusColor(event.status)} className="shrink-0">
                      {getStatusText(event.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Event Image */}
                    {event.image && (
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                        <img 
                          src={event.image} 
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Description */}
                    {event.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {event.summary}
                      </p>
                    )}

                    {/* Event Details */}
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {event.starts && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 shrink-0" />
                          <span className="truncate">{formatDateTime(event.starts)}</span>
                        </div>
                      )}
                      
                      {event.currentParticipants !== undefined && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 shrink-0" />
                          <span>
                            {event.currentParticipants}
                            {event.totalParticipants && ` / ${event.totalParticipants}`} participants
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Hashtags */}
                    {event.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {event.hashtags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                        {event.hashtags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{event.hashtags.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {event.streaming && event.status === 'live' && (
                        <Button 
                          className="flex-1" 
                          asChild
                          variant="default"
                        >
                          <a 
                            href={event.streaming} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2"
                          >
                            <Play className="h-4 w-4" />
                            Watch Live
                          </a>
                        </Button>
                      )}
                      
                      {event.recording && event.status === 'ended' && (
                        <Button 
                          className="flex-1" 
                          asChild
                          variant="outline"
                        >
                          <a 
                            href={event.recording} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2"
                          >
                            <Play className="h-4 w-4" />
                            Watch Recording
                          </a>
                        </Button>
                      )}

                      <Button 
                        variant="outline" 
                        size="icon"
                        asChild
                        title="View on Nostr"
                      >
                        <a 
                          href={`/naddr1${event.dTag}`} // This would need proper NIP-19 encoding
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 px-8 text-center">
              <div className="max-w-sm mx-auto space-y-6">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">No upcoming events</h3>
                  <p className="text-muted-foreground">
                    Peachy hasn't scheduled any live events yet. Check back soon!
                  </p>
                </div>
                <RelaySelector className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">About Live Events</h3>
              <p className="text-muted-foreground mb-4">
                All events are powered by NIP-53 on Nostr, ensuring decentralized and censorship-resistant live streaming. 
                Events are published directly to the Nostr network for maximum transparency and accessibility.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Events;