import { useParams } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MusicPlayer } from '@/components/music/MusicPlayer';
import { SuggestTrackModal } from '@/components/music/SuggestTrackModal';
import { useWavlakeTrack } from '@/hooks/useWavlake';
import type { MusicTrack } from '@/hooks/useMusicLists';
import { 
  Music, 
  ExternalLink, 
  Clock, 
  Calendar,
  User,
  Album,
  Tag,
  MessageCircle,
  ArrowLeft,
  Zap,
  TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';

const WavlakeTrack = () => {
  const { trackId } = useParams<{ trackId: string }>();
  
  // For now, we'll use a placeholder hook until we implement the actual Wavlake API integration
  // TODO: Implement useWavlakeTrack hook to fetch track details from Wavlake API
  const { data: track, isLoading, error } = useWavlakeTrack(trackId);

  // Convert WavlakeTrack to MusicTrack if needed
  const trackData: MusicTrack | undefined = track ? {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.albumTitle,
    duration: track.duration,
    image: track.albumArtUrl || track.artistArtUrl,
    mediaUrl: track.mediaUrl,
    albumArtUrl: track.albumArtUrl,
    artistArtUrl: track.artistArtUrl,
    artistId: track.artistId,
    albumId: track.albumId,
    artistNpub: track.artistNpub,
    msatTotal: track.msatTotal,
    releaseDate: track.releaseDate,
    description: `Track from ${track.artist} • Album: ${track.albumTitle}`,
    publishedAt: new Date(track.releaseDate).getTime() / 1000,
    urls: [{
      url: track.mediaUrl,
      mimeType: 'audio/mpeg',
      quality: 'stream'
    }],
    createdAt: Math.floor(Date.now() / 1000),
    pubkey: track.artistNpub,
  } : undefined;

  useSeoMeta({
    title: trackData ? `${trackData.title || 'Unknown Track'} - ${trackData.artist || 'Unknown Artist'}` : 'Track',
    description: trackData ? `Listen to "${trackData.title || 'Unknown Track'}" by ${trackData.artist || 'Unknown Artist'} on Peachy's Wavlake collection.` : 'Discover great Bitcoin music on Wavlake.',
  });

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return null;
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          {/* Back link skeleton */}
          <Skeleton className="h-4 w-32 mb-6" />
          
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Hero section skeleton */}
            <Card>
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row gap-6">
                  <Skeleton className="w-64 h-64 rounded-lg mx-auto md:mx-0" />
                  <div className="flex-1 space-y-4">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-10 w-24" />
                      <Skeleton className="h-10 w-32" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Player skeleton */}
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !trackData) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <Link 
            to="/wavlake-picks" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Wavlake Picks
          </Link>

          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="py-12 px-8 text-center">
                <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Track Not Found</h3>
                <p className="text-muted-foreground">
                  The track you're looking for could not be found or is no longer available.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Back navigation */}
        <Link 
          to="/wavlake-picks" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Wavlake Picks
        </Link>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero Section */}
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Track Artwork */}
                <div className="shrink-0 mx-auto md:mx-0">
                  {trackData.image ? (
                    <img
                      src={trackData.image}
                      alt={trackData.title || 'Track artwork'}
                      className="w-64 h-64 rounded-lg object-cover shadow-lg"
                    />
                  ) : (
                    <div className="w-64 h-64 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shadow-lg">
                      <Music className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Track Info */}
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">
                      {trackData.title || 'Unknown Track'}
                    </h1>
                    <h2 className="text-xl text-muted-foreground mb-4 flex items-center justify-center md:justify-start gap-2">
                      <User className="h-5 w-5" />
                      {trackData.artistId ? (
                        <Link 
                          to={`/artist/${trackData.artistId}`}
                          className="hover:text-primary transition-colors underline"
                        >
                          {trackData.artist || 'Unknown Artist'}
                        </Link>
                      ) : (
                        trackData.artist || 'Unknown Artist'
                      )}
                    </h2>
                    
                    {trackData.album && (
                      <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2 mb-2">
                        <Album className="h-4 w-4" />
                        {trackData.albumId ? (
                          <Link 
                            to={`/album/${trackData.albumId}`}
                            className="hover:text-primary transition-colors underline"
                          >
                            {trackData.album}
                          </Link>
                        ) : (
                          trackData.album
                        )}
                      </p>
                    )}
                  </div>

                  {/* Track Metadata */}
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {trackData.genre && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {trackData.genre}
                      </Badge>
                    )}
                    
                    {trackData.duration && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(trackData.duration)}
                      </Badge>
                    )}

                    {trackData.publishedAt && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(trackData.publishedAt)}
                      </Badge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    <SuggestTrackModal track={trackData}>
                      <Button className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Suggest to Peachy
                      </Button>
                    </SuggestTrackModal>

                    <Button variant="outline" asChild>
                      <a
                        href={`https://wavlake.com/track/${trackData.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open in Wavlake
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Music Player */}
          <MusicPlayer
            track={trackData}
            autoPlay={false}
          />

          {/* Track Description */}
          {trackData.description && (
            <Card>
              <CardHeader>
                <CardTitle>About This Track</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {trackData.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Track Details */}
          <Card>
            <CardHeader>
              <CardTitle>Track Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    Track Details
                  </h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Artist:</dt>
                      <dd>
                        {trackData.artistId ? (
                          <Link 
                            to={`/artist/${trackData.artistId}`}
                            className="hover:text-primary transition-colors underline"
                          >
                            {trackData.artist || 'Unknown'}
                          </Link>
                        ) : (
                          trackData.artist || 'Unknown'
                        )}
                      </dd>
                    </div>
                    {trackData.album && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Album:</dt>
                        <dd>
                          {trackData.albumId ? (
                            <Link 
                              to={`/album/${trackData.albumId}`}
                              className="hover:text-primary transition-colors underline"
                            >
                              {trackData.album}
                            </Link>
                          ) : (
                            trackData.album
                          )}
                        </dd>
                      </div>
                    )}
                    {trackData.duration && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Duration:</dt>
                        <dd>{formatDuration(trackData.duration)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Track ID:</dt>
                      <dd className="font-mono text-xs">{trackData.id}</dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Release & Stats
                  </h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Release Date:</dt>
                      <dd>{trackData.releaseDate ? new Date(trackData.releaseDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }) : 'Unknown'}</dd>
                    </div>
                    {trackData.msatTotal && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          Total Earnings:
                        </dt>
                        <dd className="font-medium">
                          {Math.floor(parseInt(trackData.msatTotal) / 1000).toLocaleString()} sats
                        </dd>
                      </div>
                    )}
                    {trackData.artistNpub && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Artist Nostr:</dt>
                        <dd className="font-mono text-xs truncate max-w-32" title={trackData.artistNpub}>
                          {trackData.artistNpub.slice(0, 16)}...
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default WavlakeTrack;