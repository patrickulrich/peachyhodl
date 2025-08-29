import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MusicPlayer } from '@/components/music/MusicPlayer';
import { useWavlakeArtist } from '@/hooks/useWavlake';
import QRCode from 'qrcode';
import { 
  X, 
  Music, 
  User,
  QrCode,
  Zap,
  Maximize,
  Minimize,
  Trophy
} from 'lucide-react';
import type { MusicTrack } from '@/hooks/useMusicLists';
import type { NostrEvent } from '@nostrify/nostrify';

interface VoteData {
  trackId: string;
  trackTitle: string;
  trackArtist: string;
  wavlakeUrl: string;
  votes: number;
  voters: string[];
}

export default function LeaderboardPartyView() {
  useSeoMeta({
    title: 'Top 3 Countdown Party Mode',
    description: 'Full-screen countdown experience featuring the top 3 voted tracks from the community.',
  });

  const navigate = useNavigate();
  const { nostr } = useNostr();
  
  // Query all voting events (same as WeeklySongsLeaderboard)
  const { data: voteEvents = [], isLoading: isVotesLoading } = useQuery({
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

  // Process vote events into top 3 leaderboard data
  const top3VoteData = useMemo(() => {
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
      .slice(0, 3); // Top 3 only
  }, [voteEvents]);

  // Pre-fetch track data for top 3 tracks
  const { data: musicTracks = new Map<string, MusicTrack>(), isLoading: isTracksLoading } = useQuery({
    queryKey: ['leaderboard-party-tracks', top3VoteData.map(v => v.trackId).join(',')],
    queryFn: async () => {
      if (top3VoteData.length === 0) return new Map<string, MusicTrack>();
      
      const { wavlakeAPI } = await import('@/lib/wavlake');
      const trackMap = new Map<string, MusicTrack>();
      
      // Fetch all tracks in parallel for better performance
      const trackPromises = top3VoteData.map(async (voteData) => {
        try {
          const track = await wavlakeAPI.getTrack(voteData.trackId);
          const musicTrack: MusicTrack = {
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
          trackMap.set(voteData.trackId, musicTrack);
        } catch (error) {
          console.error(`Failed to fetch track ${voteData.trackId}:`, error);
        }
      });
      
      await Promise.allSettled(trackPromises);
      return trackMap;
    },
    enabled: top3VoteData.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Convert track data to array format for party view (reversed for countdown effect)
  const tracks = useMemo(() => {
    const trackList = top3VoteData.map(voteData => {
      return musicTracks.get(voteData.trackId);
    }).filter(Boolean) as MusicTrack[];
    
    // Reverse the order so we count down: 3rd → 2nd → 1st
    return trackList.reverse();
  }, [top3VoteData, musicTracks]);
  
  // Also reverse the vote data to match
  const reversedTop3VoteData = useMemo(() => {
    return [...top3VoteData].reverse();
  }, [top3VoteData]);

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true); // Auto-play enabled
  const [zapQrCode, setZapQrCode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentTrack = tracks[currentTrackIndex];
  const currentVoteData = reversedTop3VoteData[currentTrackIndex];
  const isLoading = isVotesLoading || isTracksLoading;
  
  // Calculate position number for countdown effect (3rd, 2nd, 1st)
  const trackPosition = 3 - currentTrackIndex;

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
      if (!currentTrack?.id) {
        setZapQrCode(null);
        return;
      }

      try {
        // Get LNURL for the track from Wavlake API
        const { wavlakeAPI } = await import('@/lib/wavlake');
        const lnurlResponse = await wavlakeAPI.getLnurl(currentTrack.id, 'peachyhodl');
        
        if (!lnurlResponse.lnurl) {
          throw new Error('No LNURL found for this track');
        }

        // Decode LNURL to get the actual URL
        const { bech32 } = await import('bech32');
        const decoded = bech32.decode(lnurlResponse.lnurl, 2000);
        const bytes = bech32.fromWords(decoded.words);
        const lnurlPayUrl = new TextDecoder().decode(new Uint8Array(bytes));

        // Fetch LNURL-pay parameters
        const lnurlPayResponse = await fetch(lnurlPayUrl);
        if (!lnurlPayResponse.ok) {
          throw new Error('Failed to fetch LNURL-pay parameters');
        }
        
        const lnurlPayData = await lnurlPayResponse.json();
        
        if (lnurlPayData.status === 'ERROR') {
          throw new Error(lnurlPayData.reason || 'LNURL-pay error');
        }

        // Request a 1000 sat invoice
        const amountMsats = 1000 * 1000; // 1000 sats in millisats
        
        // Validate amount is within allowed range
        if (amountMsats < lnurlPayData.minSendable || amountMsats > lnurlPayData.maxSendable) {
          console.warn(`Amount adjusted to fit range: ${lnurlPayData.minSendable / 1000} - ${lnurlPayData.maxSendable / 1000} sats`);
        }

        // Request invoice from callback URL
        const callbackUrl = new URL(lnurlPayData.callback);
        callbackUrl.searchParams.set('amount', Math.max(amountMsats, lnurlPayData.minSendable).toString());
        callbackUrl.searchParams.set('comment', `Top 3 leaderboard zap for ${currentTrack.title} 🏆`);

        const invoiceResponse = await fetch(callbackUrl.toString());
        if (!invoiceResponse.ok) {
          throw new Error('Failed to generate invoice');
        }

        const invoiceData = await invoiceResponse.json();
        
        if (invoiceData.status === 'ERROR') {
          throw new Error(invoiceData.reason || 'Invoice generation error');
        }

        if (!invoiceData.pr) {
          throw new Error('No payment request returned');
        }

        // Generate QR code from the Lightning invoice
        const qrDataUrl = await QRCode.toDataURL(invoiceData.pr.toUpperCase(), {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
        
        setZapQrCode(qrDataUrl);
      } catch (error) {
        console.error('Failed to generate Lightning QR code:', error);
        // Fallback: Generate QR code for the LNURL itself if invoice generation fails
        try {
          const { wavlakeAPI } = await import('@/lib/wavlake');
          const lnurlResponse = await wavlakeAPI.getLnurl(currentTrack.id, 'peachyhodl');
          
          if (lnurlResponse.lnurl) {
            const qrDataUrl = await QRCode.toDataURL(lnurlResponse.lnurl.toUpperCase(), {
              width: 300,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#FFFFFF',
              },
            });
            setZapQrCode(qrDataUrl);
          } else {
            setZapQrCode(null);
          }
        } catch (fallbackError) {
          console.error('Fallback QR generation also failed:', fallbackError);
          setZapQrCode(null);
        }
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
    navigate('/weekly-songs-leaderboard');
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

  if (!reversedTop3VoteData.length || tracks.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Top Tracks Available</h2>
            <p className="text-muted-foreground mb-4">
              No tracks found in the weekly leaderboard for party mode.
            </p>
            <Button onClick={() => navigate('/weekly-songs-leaderboard')}>
              Back to Leaderboard
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
          title="Return to leaderboard"
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
                    <Badge variant="secondary" className={`text-lg px-3 py-1 font-bold ${
                      trackPosition === 1 ? 'bg-yellow-500 text-yellow-900' :
                      trackPosition === 2 ? 'bg-gray-400 text-gray-900' :
                      trackPosition === 3 ? 'bg-amber-600 text-amber-100' :
                      ''
                    }`}>
                      #{trackPosition}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      of {tracks.length}
                    </p>
                  </div>
                  
                  {/* Vote count */}
                  {currentVoteData && (
                    <Badge variant="outline" className="text-sm px-3 py-1">
                      {currentVoteData.votes} vote{currentVoteData.votes !== 1 ? 's' : ''}
                    </Badge>
                  )}
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

                <div className="w-72 h-72 mx-auto bg-white rounded-lg p-4 flex items-center justify-center">
                  {zapQrCode ? (
                    <img
                      src={zapQrCode}
                      alt="Lightning Invoice QR Code"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="animate-pulse">
                        <QrCode className="h-24 w-24 text-muted-foreground/50 mx-auto" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Generating Lightning invoice...
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