import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import type { MusicTrack } from '@/hooks/useMusicLists';
import { WavlakeZapDialog } from '@/components/music/WavlakeZapDialog';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Clock,
  Zap,
  Heart,
  X
} from 'lucide-react';

interface MusicPlayerProps {
  track: MusicTrack;
  onNext?: () => void;
  onPrevious?: () => void;
  onClose?: () => void;
  autoPlay?: boolean;
  className?: string;
}

export function MusicPlayer({ track, onNext, onPrevious, onClose, autoPlay = false, className }: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Voting functionality
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const { toast } = useToast();

  // Get media URL for playback from Wavlake API data
  const playbackUrl = track.mediaUrl;

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Vote for track function
  const handleVoteForTrack = useCallback(async () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to vote for songs.',
        variant: 'destructive',
      });
      return;
    }

    if (!track) {
      toast({
        title: 'Track Not Available',
        description: 'Cannot vote for this track.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create the voting event using Kind 30003 (Bookmark Sets)
      const votingEvent = {
        kind: 30003,
        content: '',
        tags: [
          ['d', 'peachy-song-vote'], // Our specific identifier
          ['title', 'Weekly Song Vote'],
          ['description', 'My vote for the best song of the week'],
          ['r', `https://wavlake.com/track/${track.id}`], // Reference to the Wavlake track
          ['track_title', track.title],
          ['track_artist', track.artist],
          ['track_id', track.id]
        ]
      };

      await publishEvent(votingEvent);

      toast({
        title: 'Vote Submitted!',
        description: `Voted for "${track.title}" by ${track.artist}`,
      });

    } catch (error) {
      console.error('Failed to submit vote:', error);
      toast({
        title: 'Vote Failed',
        description: 'Could not submit your vote. Please try again.',
        variant: 'destructive',
      });
    }
  }, [user, publishEvent, toast, track]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      if (onNext) onNext();
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onNext]);

  // Auto-play when track changes (if autoPlay is enabled)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !autoPlay || !playbackUrl) return;

    const playAudio = async () => {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Auto-play failed:', error);
        // Auto-play might be blocked by browser policy
      }
    };

    // Wait a brief moment for the audio to load
    const timer = setTimeout(playAudio, 100);
    return () => clearTimeout(timer);
  }, [track.id, autoPlay, playbackUrl]);

  // Play/pause toggle
  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  // Seek to position
  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = value[0];
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Volume control
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    
    const audio = audioRef.current;
    if (audio) {
      audio.volume = newVolume;
    }
    
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Track artwork */}
          <div className="shrink-0">
            {track.image ? (
              <img
                src={track.image}
                alt={track.title || 'Track artwork'}
                className="w-16 h-16 rounded-lg object-cover bg-muted"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Track info and controls */}
          <div className="flex-1 min-w-0">
            {/* Track metadata */}
            <div className="mb-3">
              <h3 className="font-semibold truncate">
                {track.title || 'Unknown Track'}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {track.artist || 'Unknown Artist'}
                {track.album && ` • ${track.album}`}
              </p>
              {track.genre && (
                <Badge variant="outline" className="mt-1 text-xs">
                  {track.genre}
                </Badge>
              )}
            </div>

            {/* Player controls */}
            <div className="space-y-3">
              {/* Main controls */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onPrevious}
                  disabled={!onPrevious}
                  className="h-8 w-8 p-0"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  onClick={togglePlayPause}
                  disabled={isLoading || !playbackUrl}
                  className="h-8 w-8 p-0"
                >
                  {isLoading ? (
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={onNext}
                  disabled={!onNext}
                  className="h-8 w-8 p-0"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>

                {/* Time display */}
                <div className="text-xs text-muted-foreground ml-2">
                  {formatTime(currentTime)} / {formatTime(duration || track.duration || 0)}
                </div>

                {/* Vote, Zap and Close buttons */}
                <div className="flex items-center gap-1 ml-auto">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleVoteForTrack}
                    className="h-8 w-8 p-0"
                    title="Vote for Top Track"
                  >
                    <Heart className="h-4 w-4" />
                  </Button>
                  
                  <WavlakeZapDialog track={track}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      title="Zap Artist"
                    >
                      <Zap className="h-4 w-4" />
                    </Button>
                  </WavlakeZapDialog>
                  
                  {onClose && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onClose}
                      className="h-8 w-8 p-0"
                      title="Close Player"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <Slider
                  value={[currentTime]}
                  onValueChange={handleSeek}
                  max={duration || track.duration || 100}
                  step={1}
                  className="w-full"
                  disabled={!playbackUrl}
                />
              </div>

              {/* Volume control */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleMute}
                  className="h-6 w-6 p-0"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-3 w-3" />
                  ) : (
                    <Volume2 className="h-3 w-3" />
                  )}
                </Button>

                <Slider
                  value={[isMuted ? 0 : volume]}
                  onValueChange={handleVolumeChange}
                  max={1}
                  step={0.1}
                  className="w-20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Hidden audio element */}
        {playbackUrl && (
          <audio
            ref={audioRef}
            src={playbackUrl}
            preload="metadata"
            className="hidden"
          />
        )}

        {/* Track description */}
        {track.description && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {track.description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}