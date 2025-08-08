import { useState, useCallback, useMemo } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useQueryClient } from '@tanstack/react-query';
import { Trophy, Heart, Play, Plus, Music } from 'lucide-react';
import { MusicPlayer } from '@/components/music/MusicPlayer';
import type { MusicTrack } from '@/hooks/useMusicLists';
import type { NostrEvent } from '@nostrify/nostrify';

// Peachy's pubkey
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

interface VoteData {
  trackId: string;
  trackTitle: string;
  trackArtist: string;
  wavlakeUrl: string;
  votes: number;
  voters: string[];
}

export default function WeeklySongsLeaderboard() {
  useSeoMeta({
    title: 'Weekly Songs Leaderboard - Top 10 Voted Tracks',
    description: 'See the top 10 most voted songs of the week from the community.',
  });

  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackList, setCurrentTrackList] = useState<MusicTrack[]>([]);
  const [addingTrackIds, setAddingTrackIds] = useState<Set<string>>(new Set());

  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const { toast } = useToast();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  
  const isPeachy = user?.pubkey === PEACHY_PUBKEY;

  // Query all voting events
  const { data: voteEvents = [], isLoading } = useQuery({
    queryKey: ['weekly-song-votes'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);
      
      // Get all Kind 30003 events with d="peachy-song-vote"
      const events = await nostr.query([{
        kinds: [30003],
        '#d': ['peachy-song-vote'],
        limit: 1000
      }], { signal });
      
      return events;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Process vote events into leaderboard data
  const leaderboardData = useMemo(() => {
    const voteMap = new Map<string, VoteData>();
    
    voteEvents.forEach((event: NostrEvent) => {
      const trackIdTag = event.tags.find(tag => tag[0] === 'track_id');
      const trackTitleTag = event.tags.find(tag => tag[0] === 'track_title');
      const trackArtistTag = event.tags.find(tag => tag[0] === 'track_artist');
      const urlTag = event.tags.find(tag => tag[0] === 'r');
      
      if (!trackIdTag?.[1] || !trackTitleTag?.[1] || !trackArtistTag?.[1] || !urlTag?.[1]) {
        return; // Skip invalid votes
      }
      
      const trackId = trackIdTag[1];
      const trackTitle = trackTitleTag[1];
      const trackArtist = trackArtistTag[1];
      const wavlakeUrl = urlTag[1];
      
      if (voteMap.has(trackId)) {
        const existing = voteMap.get(trackId)!;
        if (!existing.voters.includes(event.pubkey)) {
          existing.votes += 1;
          existing.voters.push(event.pubkey);
        }
      } else {
        voteMap.set(trackId, {
          trackId,
          trackTitle,
          trackArtist,
          wavlakeUrl,
          votes: 1,
          voters: [event.pubkey]
        });
      }
    });
    
    return Array.from(voteMap.values())
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 10); // Top 10
  }, [voteEvents]);

  // Convert vote data to MusicTrack for player
  const convertVoteToMusicTrack = useCallback(async (voteData: VoteData): Promise<MusicTrack | null> => {
    try {
      const { wavlakeAPI } = await import('@/lib/wavlake');
      const track = await wavlakeAPI.getTrack(voteData.trackId);
      
      return {
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
      };
    } catch (error) {
      console.error('Failed to convert vote to music track:', error);
      return null;
    }
  }, []);

  // Play track function
  const playTrack = useCallback(async (voteData: VoteData) => {
    const musicTrack = await convertVoteToMusicTrack(voteData);
    if (musicTrack) {
      setCurrentTrack(musicTrack);
      setCurrentTrackList([musicTrack]);
      setIsPlaying(true);
    } else {
      toast({
        title: 'Failed to Play Track',
        description: 'Could not load track details.',
        variant: 'destructive',
      });
    }
  }, [convertVoteToMusicTrack, toast]);

  // Add to Peachy's picks function
  const addToPeachyPicks = useCallback(async (voteData: VoteData) => {
    if (!isPeachy) return;

    // Prevent multiple simultaneous additions of the same track
    if (addingTrackIds.has(voteData.trackId)) {
      return;
    }

    const musicTrack = await convertVoteToMusicTrack(voteData);
    if (!musicTrack) {
      toast({
        title: 'Failed to Add Track',
        description: 'Could not load track details.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAddingTrackIds(prev => new Set(prev).add(voteData.trackId));
      
      // Get current picks data for optimistic update
      const currentPicksData = queryClient.getQueryData(['wavlake-picks', PEACHY_PUBKEY]);
      
      // Check if track is already added to prevent duplicates
      if (currentPicksData && typeof currentPicksData === 'object' && 'tracks' in currentPicksData) {
        const currentTracks = (currentPicksData as { tracks?: MusicTrack[] }).tracks || [];
        const isAlreadyAdded = currentTracks.some((t) => t.id === musicTrack.id);
        if (isAlreadyAdded) {
          toast({
            title: 'Track Already in Picks',
            description: `"${musicTrack.title}" is already in your weekly picks.`,
            variant: 'destructive',
          });
          return;
        }
      }

      // Optimistically update the cache immediately
      queryClient.setQueryData(['wavlake-picks', PEACHY_PUBKEY], (oldData: unknown) => {
        if (!oldData || typeof oldData !== 'object' || !('tracks' in oldData)) {
          return {
            tracks: [musicTrack],
            title: "Peachy's Weekly Wavlake Picks",
            updatedAt: Math.floor(Date.now() / 1000)
          };
        }
        
        const existingData = oldData as { tracks?: MusicTrack[] };
        const currentTracks = existingData.tracks || [];
        
        // Double-check for duplicates during optimistic update
        const isAlreadyInOptimisticData = currentTracks.some((t) => t.id === musicTrack.id);
        if (isAlreadyInOptimisticData) {
          // Return the data unchanged if duplicate found
          return existingData;
        }
        
        return {
          ...existingData,
          tracks: [...currentTracks, musicTrack],
          updatedAt: Math.floor(Date.now() / 1000)
        };
      });

      // Show success toast immediately
      toast({
        title: 'Track Added to Picks',
        description: `Added "${musicTrack.title}" by ${musicTrack.artist} to your weekly picks.`,
      });

      // Then publish to Nostr in the background
      const { addTrackToPicksSimple } = await import('@/lib/addTrackToPicks');
      try {
        const success = await addTrackToPicksSimple(musicTrack, publishEvent, (options) => {
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
      setAddingTrackIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(voteData.trackId);
        return newSet;
      });
    }
  }, [isPeachy, convertVoteToMusicTrack, toast, addingTrackIds, queryClient, publishEvent]);

  const handleNext = useCallback(() => {
    // TODO: Implement next track functionality
  }, []);

  const handlePrevious = useCallback(() => {
    // TODO: Implement previous track functionality  
  }, []);

  const handleClosePlayer = useCallback(() => {
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTrackList([]);
  }, []);

  // Restrict access to Peachy only
  if (user && !isPeachy) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Restricted</h1>
            <p className="text-muted-foreground">
              This page is only available to Peachy.
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className={`container mx-auto px-4 py-8 ${currentTrack ? 'pb-48 sm:pb-8' : ''}`}>
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
            <Trophy className="h-10 w-10 text-primary" />
            Weekly Songs Leaderboard
          </h1>
          <p className="text-lg text-muted-foreground">
            The top 10 most voted songs of the week from our community.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Top 10 Voted Songs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <Skeleton className="w-14 h-14 rounded" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : leaderboardData.length > 0 ? (
                leaderboardData.map((vote, index) => {
                  const isCurrentTrack = currentTrack?.id === vote.trackId;
                  const trackIsPlaying = isCurrentTrack && isPlaying;
                  
                  return (
                    <Card key={vote.trackId} className={`group hover:shadow-md transition-all duration-200 ${
                      isCurrentTrack ? 'ring-2 ring-primary/20 bg-primary/5' : ''
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex items-center gap-3">
                            {/* Ranking */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0 ? 'bg-yellow-500 text-yellow-900' :
                              index === 1 ? 'bg-gray-400 text-gray-900' :
                              index === 2 ? 'bg-amber-600 text-amber-100' :
                              'bg-primary/10 text-primary'
                            }`}>
                              {index + 1}
                            </div>
                            
                            {/* Album art placeholder */}
                            <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center overflow-hidden relative group flex-shrink-0">
                              <Music className="h-7 w-7 text-muted-foreground" />
                              
                              {/* Play overlay */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                  size="sm"
                                  className="rounded-full h-8 w-8 p-0"
                                  onClick={() => playTrack(vote)}
                                >
                                  {trackIsPlaying ? (
                                    <div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Play className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0 ml-11 sm:ml-0">
                            <h3 className={`font-medium line-clamp-1 ${isCurrentTrack ? 'text-primary' : ''}`}>
                              {vote.trackTitle}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {vote.trackArtist}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <Heart className="h-3 w-3 text-red-500" />
                                {vote.votes} vote{vote.votes !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="hidden sm:flex items-center gap-2 sm:ml-auto">
                            <Button
                              size="sm"
                              variant={trackIsPlaying ? "default" : "outline"}
                              onClick={() => playTrack(vote)}
                            >
                              {trackIsPlaying ? (
                                <div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin mr-2" />
                              ) : (
                                <Play className="h-3 w-3 mr-2" />
                              )}
                              {trackIsPlaying ? 'Playing' : 'Play'}
                            </Button>
                            
                            {isPeachy && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addToPeachyPicks(vote)}
                                disabled={addingTrackIds.has(vote.trackId)}
                              >
                                {addingTrackIds.has(vote.trackId) ? (
                                  <div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin mr-1" />
                                ) : (
                                  <Plus className="h-3 w-3 mr-1" />
                                )}
                                Add to Picks
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {/* Mobile buttons */}
                        <div className="flex sm:hidden flex-wrap items-center gap-2 mt-3 ml-11">
                          <Button
                            size="sm"
                            variant={trackIsPlaying ? "default" : "outline"}
                            onClick={() => playTrack(vote)}
                          >
                            {trackIsPlaying ? (
                              <div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin mr-2" />
                            ) : (
                              <Play className="h-3 w-3 mr-2" />
                            )}
                            {trackIsPlaying ? 'Playing' : 'Play'}
                          </Button>
                          
                          {isPeachy && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addToPeachyPicks(vote)}
                              disabled={addingTrackIds.has(vote.trackId)}
                            >
                              {addingTrackIds.has(vote.trackId) ? (
                                <div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin mr-1" />
                              ) : (
                                <Plus className="h-3 w-3 mr-1" />
                              )}
                              Add to Picks
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Votes Yet</h3>
                    <p className="text-muted-foreground">
                      Be the first to vote for your favorite songs! Check out the Explore section to start voting.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Music Player */}
        {currentTrack && (
          <div className="fixed bottom-0 left-0 right-0 sm:bottom-4 sm:left-4 sm:right-4 z-50">
            <MusicPlayer
              track={currentTrack}
              autoPlay={isPlaying}
              onNext={currentTrackList.length > 1 ? handleNext : undefined}
              onPrevious={currentTrackList.length > 1 ? handlePrevious : undefined}
              onClose={handleClosePlayer}
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
}