import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import type { MusicTrack } from '@/hooks/useMusicLists';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  ExternalLink,
  Clock
} from 'lucide-react';

interface MusicPlayerProps {
  track: MusicTrack;
  onNext?: () => void;
  onPrevious?: () => void;
  className?: string;
}

export function MusicPlayer({ track, onNext, onPrevious, className }: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get best quality URL for playback
  const playbackUrl = track.urls.find(u => u.quality === 'stream')?.url || track.urls[0]?.url;

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

                {/* External link to Wavlake */}
                <Button
                  size="sm"
                  variant="ghost"
                  asChild
                  className="h-8 w-8 p-0 ml-auto"
                >
                  <a
                    href={playbackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open on Wavlake"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
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