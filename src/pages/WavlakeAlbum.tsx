import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWavlakeAlbum } from '@/hooks/useWavlake';
import { Music, ExternalLink, Calendar, Play, Clock, Plus, MessageCircle } from 'lucide-react';
import { MusicTrack } from '@/hooks/useMusicLists';
import { MusicPlayer } from '@/components/music/MusicPlayer';
import { SuggestTrackModal } from '@/components/music/SuggestTrackModal';
import { useState, useCallback } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { useWavlakePicks } from '@/hooks/useMusicLists';

// Peachy's pubkey
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

export default function WavlakeAlbum() {
  const { albumId } = useParams<{ albumId: string }>();
  const { data: album, isLoading, error } = useWavlakeAlbum(albumId);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isAddingTrack, setIsAddingTrack] = useState(false);
  
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  
  const isPeachy = user?.pubkey === PEACHY_PUBKEY;
  
  // Load existing picks for Peachy to ensure we have the current list before adding tracks
  const { data: _existingPicks } = useWavlakePicks();

  // Convert album tracks to MusicTrack format
  const musicTracks: MusicTrack[] = album?.tracks.map((track) => ({
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
  })) || [];

  const playTrack = (track: MusicTrack, index: number) => {
    setSelectedTrack(track);
    setCurrentTrackIndex(index);
  };

  const handleNext = () => {
    const nextIndex = currentTrackIndex + 1;
    if (nextIndex < musicTracks.length) {
      playTrack(musicTracks[nextIndex], nextIndex);
    }
  };

  const handlePrevious = () => {
    const prevIndex = currentTrackIndex - 1;
    if (prevIndex >= 0) {
      playTrack(musicTracks[prevIndex], prevIndex);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDuration = musicTracks.reduce((sum, track) => sum + (track.duration || 0), 0);

  // Add track to Peachy's picks
  const addTrackToPicks = useCallback(async (track: MusicTrack) => {
    if (!isPeachy) return;

    try {
      setIsAddingTrack(true);
      
      // Get current picks data for optimistic update
      const currentPicksData = queryClient.getQueryData(['wavlake-picks', PEACHY_PUBKEY]);
      
      // Check if track is already added to prevent duplicates
      if (currentPicksData && typeof currentPicksData === 'object' && 'tracks' in currentPicksData) {
        const currentTracks = (currentPicksData as { tracks?: MusicTrack[] }).tracks || [];
        const isAlreadyAdded = currentTracks.some((t) => t.id === track.id);
        if (isAlreadyAdded) {
          toast({
            title: 'Track Already in Picks',
            description: `"${track.title}" is already in your weekly picks.`,
            variant: 'destructive',
          });
          return;
        }
      }

      // Optimistically update the cache immediately
      queryClient.setQueryData(['wavlake-picks', PEACHY_PUBKEY], (oldData: unknown) => {
        if (!oldData || typeof oldData !== 'object' || !('tracks' in oldData)) {
          return {
            tracks: [track],
            title: "Peachy's Weekly Wavlake Picks",
            updatedAt: Math.floor(Date.now() / 1000)
          };
        }
        
        const existingData = oldData as { tracks?: MusicTrack[] };
        return {
          ...existingData,
          tracks: [...(existingData.tracks || []), track],
          updatedAt: Math.floor(Date.now() / 1000)
        };
      });

      // Show success toast immediately
      toast({
        title: 'Track Added to Picks',
        description: `Added "${track.title}" by ${track.artist} to your weekly picks.`,
      });

      // Then publish to Nostr in the background
      const { addTrackToPicksSimple } = await import('@/lib/addTrackToPicks');
      try {
        const success = await addTrackToPicksSimple(track, publishEvent, (options) => {
          // Only show error toasts, not success toasts (to prevent duplicates)
          if (options.variant === 'destructive') {
            toast(options);
          }
        }, queryClient);
        
        if (!success) {
          // If addTrackToPicksSimple returned false, revert the optimistic update
          queryClient.invalidateQueries({
            queryKey: ['wavlake-picks', PEACHY_PUBKEY]
          });
        }
      } catch (publishError) {
        console.warn('Failed to publish to Nostr:', publishError);
        
        // Revert the optimistic update on publish failure
        queryClient.invalidateQueries({
          queryKey: ['wavlake-picks', PEACHY_PUBKEY]
        });
        
        toast({
          title: 'Failed to Save to Nostr',
          description: 'Track was added locally but could not be saved to Nostr.',
          variant: 'destructive',
        });
      }

    } catch (error) {
      console.error('Failed to add track to picks:', error);
      
      // Revert the optimistic update on error
      queryClient.invalidateQueries({
        queryKey: ['wavlake-picks', PEACHY_PUBKEY]
      });
      
      toast({
        title: 'Failed to Add Track',
        description: 'Could not add track to your picks. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAddingTrack(false);
    }
  }, [isPeachy, publishEvent, toast, queryClient]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-6">
                <Skeleton className="w-48 h-48 rounded-lg" />
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (error || !album) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Album Not Found</h2>
              <p className="text-muted-foreground">
                The requested album could not be found.
              </p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Album Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-6">
                <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                  {album.albumArtUrl ? (
                    <img 
                      src={album.albumArtUrl} 
                      alt={album.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music className="h-24 w-24 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <Badge variant="outline" className="mb-2">Album</Badge>
                    <CardTitle className="text-3xl">{album.title}</CardTitle>
                    <p className="text-xl text-muted-foreground mt-2">
                      by{' '}
                      <Link 
                        to={`/artist/${album.tracks[0]?.artistId}`}
                        className="hover:text-foreground transition-colors underline"
                      >
                        {album.artist}
                      </Link>
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(album.releaseDate).getFullYear()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Music className="h-3 w-3" />
                      {album.tracks.length} track{album.tracks.length !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.floor(totalDuration / 60)} min
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <Button 
                      onClick={() => album.tracks.length > 0 && playTrack(musicTracks[0], 0)}
                      disabled={album.tracks.length === 0}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Play Album
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a 
                        href={`https://wavlake.com/album/${albumId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View on Wavlake
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Track List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Tracks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {musicTracks.map((track, index) => (
                  <div
                    key={track.id}
                    className={`flex items-center gap-4 p-3 rounded-lg transition-colors cursor-pointer group ${
                      selectedTrack?.id === track.id ? 'bg-primary/10' : 'hover:bg-accent'
                    }`}
                    onClick={() => playTrack(track, index)}
                  >
                    <div className="w-8 h-8 flex items-center justify-center text-sm font-medium text-muted-foreground">
                      <span className="group-hover:hidden">{index + 1}</span>
                      <Play className="h-4 w-4 hidden group-hover:block" />
                    </div>
                    
                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center overflow-hidden">
                      {track.albumArtUrl ? (
                        <img 
                          src={track.albumArtUrl} 
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/wavlake/${track.id}`}
                        className={`font-medium truncate hover:underline block ${
                          selectedTrack?.id === track.id ? 'text-primary' : 'hover:text-primary'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {track.title}
                      </Link>
                      <p className="text-sm text-muted-foreground truncate">
                        {track.artist}
                      </p>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {formatDuration(track.duration || 0)}
                    </div>

                    <SuggestTrackModal track={track}>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Suggest to Peachy"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle className="h-3 w-3" />
                      </Button>
                    </SuggestTrackModal>

                    {isPeachy && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          addTrackToPicks(track);
                        }}
                        disabled={isAddingTrack}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add to Picks
                      </Button>
                    )}

                    <Button variant="ghost" size="sm" asChild>
                      <a 
                        href={`https://wavlake.com/track/${track.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>

              {album.tracks.length === 0 && (
                <div className="text-center py-8">
                  <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No tracks found in this album.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Music Player */}
          {selectedTrack && (
            <Card>
              <CardContent className="p-6">
                <MusicPlayer 
                  track={selectedTrack} 
                  onNext={currentTrackIndex < musicTracks.length - 1 ? handleNext : undefined}
                  onPrevious={currentTrackIndex > 0 ? handlePrevious : undefined}
                  autoPlay
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}