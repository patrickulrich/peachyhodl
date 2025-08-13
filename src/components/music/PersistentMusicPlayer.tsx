import { useRef, useEffect, useCallback, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { WavlakeZapDialog } from '@/components/music/WavlakeZapDialog';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { useMusicPlayer } from '@/hooks/useMusicPlayer';
import { useIsMobile } from '@/hooks/useIsMobile';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Zap,
  Heart,
  X,
  Music
} from 'lucide-react';

export function PersistentMusicPlayer() {
  const location = useLocation();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { 
    currentTrack, 
    isPlaying, 
    currentTime, 
    duration, 
    volume, 
    isMuted, 
    isLoading,
    isPlayerVisible,
    playlist,
    currentIndex,
    hasUserInteracted,
    togglePlay, 
    nextTrack, 
    previousTrack, 
    setCurrentTime, 
    setDuration, 
    setVolume, 
    toggleMute, 
    setIsLoading,
    closePlayer,
    setHasUserInteracted
  } = useMusicPlayer();

  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Audio event handlers
  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
  }, [setIsLoading]);

  const handleLoadedData = useCallback(() => {
    setIsLoading(false);
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, [setDuration, setIsLoading]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, [setCurrentTime]);

  const handleCanPlay = useCallback(() => {
    // Try to play if we should be playing and user has interacted
    if (isPlaying && hasUserInteracted && audioRef.current && audioRef.current.paused) {
      audioRef.current.play()
        .then(() => {
          // Playback started successfully
        })
        .catch(() => {
          // Auto-play failed, but this is expected in many browsers
        });
    }
  }, [isPlaying, hasUserInteracted]);

  const handleEnded = useCallback(() => {
    // Auto-advance to next track if available
    if (playlist.length > 1) {
      nextTrack();
    }
  }, [nextTrack, playlist.length]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    console.error('Audio playback error - Current track:', currentTrack);
    
    // Only show toast for actual loading errors, not AbortErrors from quick clicking
    if (audioRef.current?.error) {
      const audioError = audioRef.current.error;
      // MediaError.MEDIA_ERR_ABORTED = 1
      if (audioError.code !== 1) {
        toast({
          title: "Playback Error",
          description: `Failed to load "${currentTrack?.title || 'the audio track'}". Please try again.`,
          variant: "destructive",
        });
      }
    }
  }, [setIsLoading, toast, currentTrack]);

  // Sync audio element with context state
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying && !audioRef.current.paused) {
      // Already playing, do nothing
      return;
    }

    if (isPlaying && hasUserInteracted) {
      // Try to play if user has interacted
      if (audioRef.current.readyState >= 3) { // HAVE_FUTURE_DATA or higher
        audioRef.current.play()
          .then(() => {
            // Playback started successfully
          })
          .catch(() => {
            // Audio playback failed
          });
      }
    } else if (!isPlaying) {
      audioRef.current.pause();
    }
  }, [isPlaying, hasUserInteracted, currentTrack]);

  // Update audio source when track changes
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;

    // Get the media URL from either mediaUrl or urls array
    let mediaUrl = currentTrack.mediaUrl || currentTrack.urls?.[0]?.url;
    
    if (!mediaUrl) {
      console.error('No valid media URL found for track:', currentTrack);
      setIsLoading(false);
      toast({
        title: "Playback Error",
        description: `Failed to load "${currentTrack?.title || 'the audio track'}". Please try again.`,
        variant: "destructive",
      });
      return;
    }

    // If it's an op3.dev analytics URL, try to extract the direct CloudFront URL
    if (mediaUrl.includes('op3.dev/e,')) {
      const match = mediaUrl.match(/https:\/\/op3\.dev\/e,[^/]+\/(.+)/);
      if (match && match[1]) {
        const directUrl = decodeURIComponent(match[1]);
        mediaUrl = directUrl;
      }
    }

    audioRef.current.src = mediaUrl;
    audioRef.current.load();
  }, [currentTrack, setIsLoading, toast]);

  // Update volume
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const handleSeek = useCallback((value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  }, [setCurrentTime]);

  const handleVolumeChange = useCallback((value: number[]) => {
    setVolume(value[0]);
  }, [setVolume]);

  // Simple mobile-friendly toggle play
  const handleTogglePlay = useCallback(() => {
    setHasUserInteracted(true);
    
    if (!audioRef.current || !currentTrack) {
      togglePlay();
      return;
    }

    if (!isPlaying) {
      // ALWAYS try to play immediately on user click for mobile compatibility
      audioRef.current.play()
        .then(() => {
          // Sync state only after successful play
          if (!isPlaying) togglePlay();
        })
        .catch((_error) => {
          // Fall back to state update for loading scenarios
          togglePlay();
        });
    } else {
      togglePlay(); // Just pause
    }
  }, [isPlaying, currentTrack, togglePlay, setHasUserInteracted]);

  // Navigation handlers that mark user interaction
  const handleNextTrack = useCallback(() => {
    setHasUserInteracted(true);
    nextTrack();
  }, [nextTrack, setHasUserInteracted]);

  const handlePreviousTrack = useCallback(() => {
    setHasUserInteracted(true);
    previousTrack();
  }, [previousTrack, setHasUserInteracted]);

  const handleClosePlayer = useCallback(() => {
    closePlayer();
  }, [closePlayer]);

  const handleVoteTrack = useCallback(() => {
    if (!user || !currentTrack) {
      toast({
        title: "Login Required",
        description: "Please log in to vote for tracks.",
        variant: "destructive",
      });
      return;
    }

    // Create a kind 30003 bookmark set for voting
    createEvent({
      kind: 30003,
      content: '',
      tags: [
        ['d', 'peachy-song-vote'],
        ['title', 'Peachy Song Vote'],
        ['a', `32123:${currentTrack.pubkey}:${currentTrack.id}`],
        ['e', currentTrack.id],
        ['r', `https://wavlake.com/track/${currentTrack.id}`],
        ['track_title', currentTrack.title],
        ['track_artist', currentTrack.artist],
        ['track_id', currentTrack.id]
      ]
    });

    toast({
      title: "Vote Submitted!",
      description: `Voted for "${currentTrack.title}" by ${currentTrack.artist}`,
    });
  }, [user, currentTrack, createEvent, toast]);

  // Hide player on radio and party view pages
  const isFullscreenPage = location.pathname === '/explore-wavlake/radio' || location.pathname === '/party-view';
  
  // Don't render if on fullscreen pages or if player is not visible
  if (isFullscreenPage || !isPlayerVisible || !currentTrack) {
    return null;
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const hasNavigation = playlist.length > 1;

  // Responsive layout - full bar on desktop, expandable on mobile
  if (isMobile) {
    // Mobile: Expandable popup design
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t safe-area-inset-bottom">
        <Card className="rounded-none border-0 shadow-lg">
          <CardContent className="p-3">
            {/* Mobile main player bar */}
            <div className="flex items-center gap-3">
              {/* Track artwork and info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-pointer"
                     onClick={() => setIsExpanded(!isExpanded)}>
                  {currentTrack.image ? (
                    <img
                      src={currentTrack.image}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                  <h3 className="font-semibold text-sm truncate">{currentTrack.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
                </div>
              </div>

              {/* Mobile essential controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTogglePlay}
                  disabled={isLoading}
                  className="h-10 w-10 p-0"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  ) : isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>

                {/* Next Track button */}
                {hasNavigation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextTrack}
                    className="h-8 w-8 p-0"
                    title="Next track"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClosePlayer}
                  className="h-8 w-8 p-0"
                  title="Close player"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Mobile expanded controls panel */}
            {isExpanded && (
              <div className="mt-4 space-y-4 border-t pt-4">
                {/* Mobile expanded track info with clickable links */}
                <div className="text-center space-y-1">
                  <Link
                    to={`/wavlake/${currentTrack.id}`}
                    className="font-semibold text-sm hover:text-primary transition-colors block"
                  >
                    {currentTrack.title}
                  </Link>
                  {currentTrack.artistId && (
                    <Link
                      to={`/artist/${currentTrack.artistId}`}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors block"
                    >
                      {currentTrack.artist}
                    </Link>
                  )}
                  {!currentTrack.artistId && (
                    <p className="text-xs text-muted-foreground">{currentTrack.artist}</p>
                  )}
                  {hasNavigation && (
                    <p className="text-xs text-muted-foreground">
                      {currentIndex + 1} of {playlist.length}
                    </p>
                  )}
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {formatTime(currentTime)}
                  </span>
                  <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={1}
                    onValueChange={handleSeek}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-10">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Full controls row */}
                <div className="flex items-center justify-between">
                  {/* Navigation controls */}
                  <div className="flex items-center gap-2">
                    {hasNavigation && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handlePreviousTrack}
                          className="h-8 w-8 p-0"
                        >
                          <SkipBack className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleNextTrack}
                          className="h-8 w-8 p-0"
                        >
                          <SkipForward className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground ml-2">
                          {currentIndex + 1} of {playlist.length}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Volume control */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleMute}
                      className="h-8 w-8 p-0"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      max={1}
                      step={0.01}
                      onValueChange={handleVolumeChange}
                      className="w-20"
                    />
                  </div>
                </div>

                {/* Action buttons below controls */}
                <div className="flex items-center justify-center gap-6 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleVoteTrack}
                    className="flex flex-col items-center gap-1 h-auto p-2"
                    title="Vote for this track"
                  >
                    <Heart className="h-5 w-5" />
                    <span className="text-xs">Vote</span>
                  </Button>
                  
                  <WavlakeZapDialog track={currentTrack}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex flex-col items-center gap-1 h-auto p-2"
                      title="Zap artist"
                    >
                      <Zap className="h-5 w-5" />
                      <span className="text-xs">Zap</span>
                    </Button>
                  </WavlakeZapDialog>
                </div>
              </div>
            )}

            {/* Hidden Audio Element for Mobile */}
            <audio
              ref={audioRef}
              onLoadStart={handleLoadStart}
              onLoadedData={handleLoadedData}
              onLoadedMetadata={() => {}}
              onCanPlay={handleCanPlay}
              onCanPlayThrough={() => {}}
              onPlay={() => {}}
              onPlaying={() => {}}
              onPause={() => {}}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onError={handleError}
              onStalled={() => {}}
              onSuspend={() => {}}
              onWaiting={() => {}}
              onAbort={() => {}}
              preload="metadata"
              style={{ display: 'none' }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Desktop: Everything on the bar
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
      <Card className="rounded-none border-0 shadow-lg">
        <CardContent className="py-4 pl-4 pr-4">
          <div className="flex items-center justify-between w-full">
            {/* Left: Track Info */}
            <div className="flex items-center gap-3 min-w-0 w-80">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {currentTrack.image ? (
                  <img
                    src={currentTrack.image}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <div className="min-w-0 flex-1">
                <Link
                  to={`/wavlake/${currentTrack.id}`}
                  className="font-semibold text-sm truncate hover:text-primary transition-colors block"
                >
                  {currentTrack.title}
                </Link>
                {currentTrack.artistId && (
                  <Link
                    to={`/artist/${currentTrack.artistId}`}
                    className="text-xs text-muted-foreground truncate hover:text-primary transition-colors block"
                  >
                    {currentTrack.artist}
                  </Link>
                )}
                {!currentTrack.artistId && (
                  <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
                )}
                {hasNavigation && (
                  <p className="text-xs text-muted-foreground">
                    {currentIndex + 1} of {playlist.length}
                  </p>
                )}
              </div>
            </div>

            {/* Center: Controls, Scrubber, and Volume */}
            <div className="flex items-center gap-3 flex-1 justify-center max-w-2xl">
              {/* Media Controls */}
              <div className="flex items-center gap-1">
                {/* Previous Track */}
                {hasNavigation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePreviousTrack}
                    className="h-8 w-8 p-0"
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                )}

                {/* Play/Pause Control */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTogglePlay}
                  disabled={isLoading}
                  className="h-10 w-10 p-0"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  ) : isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>

                {/* Next Track */}
                {hasNavigation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextTrack}
                    className="h-8 w-8 p-0"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <span className="text-xs text-muted-foreground w-8 text-right">
                  {formatTime(currentTime)}
                </span>
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={1}
                  onValueChange={handleSeek}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-8">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="h-8 w-8 p-0"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="w-16"
                />
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVoteTrack}
                className="h-8 w-8 p-0"
                title="Vote for this track"
              >
                <Heart className="h-4 w-4" />
              </Button>
              
              <WavlakeZapDialog track={currentTrack}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Zap artist"
                >
                  <Zap className="h-4 w-4" />
                </Button>
              </WavlakeZapDialog>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClosePlayer}
                className="h-8 w-8 p-0"
                title="Close player"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Hidden Audio Element */}
          <audio
            ref={audioRef}
            onLoadStart={handleLoadStart}
            onLoadedData={handleLoadedData}
            onLoadedMetadata={() => {}}
            onCanPlay={handleCanPlay}
            onCanPlayThrough={() => {}}
            onPlay={() => {}}
            onPlaying={() => {}}
            onPause={() => {}}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onError={handleError}
            onStalled={() => {}}
            onSuspend={() => {}}
            onWaiting={() => {}}
            onAbort={() => {}}
            preload="metadata"
          />
        </CardContent>
      </Card>
    </div>
  );
}