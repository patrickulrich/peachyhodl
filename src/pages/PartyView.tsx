import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MusicPlayer } from '@/components/music/MusicPlayer';
import { useWavlakePicks, useTracksFromList } from '@/hooks/useMusicLists';
import { useWavlakeArtist } from '@/hooks/useWavlake';
import { 
  X, 
  Music, 
  User,
  QrCode,
  Zap,
  Maximize,
  Minimize
} from 'lucide-react';

export default function PartyView() {
  useSeoMeta({
    title: 'Party Mode - Peachy\'s Wavlake Picks',
    description: 'Full-screen music experience with artist information and zap codes.',
  });

  const navigate = useNavigate();
  const { data: wavlakeList, isLoading: isListLoading } = useWavlakePicks();
  const { data: tracksOriginal = [], isLoading: isTracksLoading } = useTracksFromList(wavlakeList?.tracks || []);
  
  // Reverse tracks for countdown effect (start from last, count down to #1)
  const tracks = [...tracksOriginal].reverse();
  
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true); // Auto-play enabled
  const [zapQrCode, setZapQrCode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentTrack = tracks[currentTrackIndex];
  const isLoading = isListLoading || isTracksLoading;
  
  // Calculate position number (counting down from total to 1)
  const trackPosition = tracks.length - currentTrackIndex;

  // Fetch artist data for the current track
  const { data: artistData } = useWavlakeArtist(
    currentTrack?.artistId || undefined
  );

  // Auto-advance to next track
  const handleNext = useCallback(() => {
    if (tracks.length === 0) return;
    
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    setCurrentTrackIndex(nextIndex);
    setIsPlaying(true);
  }, [currentTrackIndex, tracks.length]);

  const handlePrevious = useCallback(() => {
    if (tracks.length === 0) return;
    
    const prevIndex = currentTrackIndex === 0 ? tracks.length - 1 : currentTrackIndex - 1;
    setCurrentTrackIndex(prevIndex);
    setIsPlaying(true);
  }, [currentTrackIndex, tracks.length]);

  // Generate Lightning QR code for zapping
  useEffect(() => {
    const generateZapQr = async () => {
      if (!currentTrack?.artist) {
        setZapQrCode(null);
        return;
      }

      try {
        // Create a Lightning invoice URL for the artist
        // Using a more reliable approach with the artist's Wavlake profile
        const zapAmount = 1000; // 1000 sats
        const zapData = `https://wavlake.com/artist/${currentTrack.artistId}?zap=${zapAmount}`;
        
        // Generate QR code using a reliable QR service
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&data=${encodeURIComponent(zapData)}`;
        setZapQrCode(qrUrl);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
        // Fallback QR code
        const fallbackData = `https://wavlake.com/artist/${currentTrack?.artistId || ''}`;
        setZapQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&data=${encodeURIComponent(fallbackData)}`);
      }
    };

    generateZapQr();
  }, [currentTrack]);

  // Auto-play management
  useEffect(() => {
    if (tracks.length > 0 && !currentTrack) {
      setCurrentTrackIndex(0);
    }
  }, [tracks, currentTrack]);

  // Enter fullscreen mode on mount
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        }
      } catch (error) {
        console.log('Could not enter fullscreen:', error);
      }
    };

    // Enter fullscreen after a short delay to ensure the page is loaded
    const timer = setTimeout(enterFullscreen, 100);

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Exit fullscreen and navigate back
  const handleClose = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {
        // Fallback if exit fullscreen fails
      });
    }
    navigate('/wavlake-picks');
  }, [navigate]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.log('Could not toggle fullscreen:', error);
    }
  }, []);

  // Handle ESC key to exit fullscreen (but stay on page)
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      // Note: ESC automatically exits fullscreen in most browsers
      // This is just for handling any additional logic if needed
      if (e.key === 'Escape' && !document.fullscreenElement) {
        // Fullscreen was exited via ESC, update our state
        setIsFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!wavlakeList || tracks.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <Music className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Tracks Available</h2>
            <p className="text-muted-foreground mb-4">
              No tracks found in Peachy's playlist for party mode.
            </p>
            <Button onClick={() => navigate('/wavlake-picks')}>
              Back to Playlist
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Control buttons */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        {/* Fullscreen toggle button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={toggleFullscreen}
          className="h-10 w-10 p-0 bg-background/80 backdrop-blur-sm hover:bg-background/90"
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <Minimize className="h-5 w-5" />
          ) : (
            <Maximize className="h-5 w-5" />
          )}
        </Button>
        
        {/* Close button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleClose}
          className="h-10 w-10 p-0 bg-background/80 backdrop-blur-sm hover:bg-background/90"
          title="Return to playlist"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Top section - Artist Info and QR Code */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
        
        {/* Left Panel - Combined Artist and Track Information */}
        <div>
          <Card className="h-full">
            <CardContent className="p-8 h-full flex flex-col justify-between">
              
              {/* Top Section - Artist Info */}
              <div className="text-center space-y-4">
                <div className="w-40 h-40 mx-auto rounded-full overflow-hidden bg-muted">
                  {artistData?.artistArtUrl || currentTrack?.artistArtUrl ? (
                    <img
                      src={artistData?.artistArtUrl || currentTrack?.artistArtUrl}
                      alt={currentTrack?.artist}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="h-20 w-20 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                <div>
                  <h2 className="text-3xl font-bold">{currentTrack?.artist || 'Unknown Artist'}</h2>
                </div>
              </div>

              {/* Middle Section - Spacer */}
              <div className="flex-1 min-h-8"></div>

              {/* Bottom Section - Current Track Info */}
              <div className="text-center space-y-6">
                <div className="w-32 h-32 mx-auto rounded-lg overflow-hidden bg-muted">
                  {currentTrack?.albumArtUrl || currentTrack?.image ? (
                    <img
                      src={currentTrack.albumArtUrl || currentTrack.image}
                      alt={currentTrack.album}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">{currentTrack?.title || 'Unknown Track'}</h3>
                  <h4 className="text-lg font-semibold text-muted-foreground">{currentTrack?.album || 'Unknown Album'}</h4>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="secondary" className="text-lg px-3 py-1 font-bold">
                      #{trackPosition}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      of {tracks.length}
                    </p>
                  </div>
                </div>

                <div className="flex justify-center gap-3">
                  {currentTrack?.msatTotal && (
                    <Badge variant="outline" className="text-sm px-3 py-1">
                      {Math.floor(parseInt(currentTrack.msatTotal) / 1000)} sats
                    </Badge>
                  )}
                  {currentTrack?.duration && (
                    <Badge variant="outline" className="text-sm px-3 py-1">
                      {Math.floor(currentTrack.duration / 60)}:{String(currentTrack.duration % 60).padStart(2, '0')}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Support Artist */}
        <div>
          <Card className="h-full">
            <CardContent className="p-8 h-full flex flex-col justify-center">
              <div className="text-center space-y-8">
                <div className="flex items-center justify-center gap-3 text-yellow-500">
                  <Zap className="h-10 w-10" />
                  <h3 className="text-3xl font-bold text-foreground">Support the Artist</h3>
                </div>

                <div className="w-72 h-72 mx-auto bg-white rounded-lg p-4 flex items-center justify-center border-2 border-dashed border-muted">
                  {zapQrCode ? (
                    <img
                      src={zapQrCode}
                      alt="Lightning QR Code"
                      className="w-full h-full object-contain"
                      onLoad={() => console.log('QR Code loaded successfully')}
                      onError={(e) => {
                        console.error('QR Code failed to load:', e);
                        setZapQrCode(null);
                      }}
                    />
                  ) : (
                    <div className="text-center space-y-4">
                      <QrCode className="h-24 w-24 text-muted-foreground mx-auto" />
                      <p className="text-lg text-muted-foreground">
                        Generating QR Code...
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <p className="text-2xl font-bold">Zap {currentTrack?.artist}</p>
                  <p className="text-lg text-muted-foreground">
                    Scan with your Lightning wallet to support the artist
                  </p>
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    Suggested: 1000 sats
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom section - Music Player */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
        <div className="container mx-auto max-w-4xl">
          {currentTrack && (
            <MusicPlayer
              track={currentTrack}
              autoPlay={isPlaying}
              onNext={tracks.length > 1 ? handleNext : undefined}
              onPrevious={tracks.length > 1 ? handlePrevious : undefined}
              className="shadow-lg"
            />
          )}
        </div>
      </div>

      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
    </div>
  );
}