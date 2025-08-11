import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MusicPlayer } from '@/components/music/MusicPlayer';
import { useWavlakeRankings } from '@/hooks/useWavlake';
import type { MusicTrack } from '@/hooks/useMusicLists';
import type { WavlakeTrack } from '@/lib/wavlake';
import { 
  X, 
  Radio, 
  Filter, 
  Shuffle,
  Music,
  Play,
  Clock,
  User
} from 'lucide-react';

export default function WavlakeRadio() {
  useSeoMeta({
    title: 'Wavlake Radio - Custom Bitcoin Music Station',
    description: 'Create your own custom Bitcoin music radio station based on genre and time period.',
  });

  const navigate = useNavigate();
  
  // Filter state
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [isRadioStarted, setIsRadioStarted] = useState(false);
  
  // Player state
  const [radioPlaylist, setRadioPlaylist] = useState<MusicTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentTrack = radioPlaylist[currentTrackIndex];

  // Popular genres for filtering (same as explore-wavlake)
  const genres = [
    'Rock', 'Pop', 'Hip-Hop', 'Electronic', 'Folk', 'Jazz', 'Classical', 
    'Blues', 'Country', 'Reggae', 'Punk', 'Metal', 'R&B', 'Alternative', 
    'Indie', 'Ambient', 'Techno', 'House', 'Experimental'
  ];

  // Time period options (same as explore-wavlake)
  const timePeriods = [
    { value: 1, label: '24 hours' },
    { value: 7, label: '7 days' },
    { value: 30, label: '30 days' },
    { value: 90, label: 'Last 3 months' }
  ];

  // Fetch trending tracks based on filters
  const { data: trendingTracks = [], isLoading: isLoadingTracks } = useWavlakeRankings({
    sort: 'sats',
    days: selectedDays,
    genre: selectedGenre === 'all' ? undefined : selectedGenre,
    limit: 100, // Get more tracks for better randomization
  });

  // Convert WavlakeTrack to MusicTrack
  const convertToMusicTrack = useCallback((track: WavlakeTrack): MusicTrack => ({
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
  }), []);

  // Shuffle array helper
  const shuffleArray = useCallback(<T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  // Start radio with randomized playlist
  const handleStartRadio = useCallback(() => {
    if (trendingTracks.length === 0) return;

    // Convert and shuffle tracks
    const musicTracks = trendingTracks.map(convertToMusicTrack);
    const shuffledTracks = shuffleArray(musicTracks);
    
    setRadioPlaylist(shuffledTracks);
    setCurrentTrackIndex(0);
    setIsRadioStarted(true);
    setIsPlaying(true);
  }, [trendingTracks, convertToMusicTrack, shuffleArray]);

  // Player controls
  const handleNext = useCallback(() => {
    if (radioPlaylist.length === 0) return;
    
    const nextIndex = (currentTrackIndex + 1) % radioPlaylist.length;
    setCurrentTrackIndex(nextIndex);
    setIsPlaying(true);
  }, [currentTrackIndex, radioPlaylist.length]);

  const handlePrevious = useCallback(() => {
    if (radioPlaylist.length === 0) return;
    
    const prevIndex = currentTrackIndex === 0 ? radioPlaylist.length - 1 : currentTrackIndex - 1;
    setCurrentTrackIndex(prevIndex);
    setIsPlaying(true);
  }, [currentTrackIndex, radioPlaylist.length]);

  const handleClose = useCallback(() => {
    navigate('/explore-wavlake');
  }, [navigate]);

  // Auto-advance to next track (handled by MusicPlayer's onNext)

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Full-screen header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Radio className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Wavlake Radio</h1>
            <p className="text-sm text-muted-foreground">
              {isRadioStarted 
                ? `Playing ${selectedGenre === 'all' ? 'All Genres' : selectedGenre} • ${timePeriods.find(p => p.value === selectedDays)?.label}`
                : 'Create your custom Bitcoin music station'
              }
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleClose}
          className="h-8 w-8"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {!isRadioStarted ? (
          // Setup screen
          <div className="max-w-lg w-full space-y-8">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Radio className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-3xl font-bold">Start Your Radio Station</h2>
              <p className="text-muted-foreground">
                Choose your preferred genre and time period to create a personalized Bitcoin music radio experience.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Station Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="genre-filter">Genre</Label>
                  <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                    <SelectTrigger>
                      <SelectValue placeholder="All genres" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All genres</SelectItem>
                      {genres.map((genre) => (
                        <SelectItem key={genre} value={genre}>
                          {genre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time-filter">Time Period</Label>
                  <Select value={selectedDays.toString()} onValueChange={(value) => setSelectedDays(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timePeriods.map((period) => (
                        <SelectItem key={period.value} value={period.value.toString()}>
                          {period.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {isLoadingTracks ? (
                      'Loading tracks...'
                    ) : (
                      `${trendingTracks.length} tracks available`
                    )}
                  </div>
                  <Button 
                    onClick={handleStartRadio}
                    disabled={isLoadingTracks || trendingTracks.length === 0}
                    size="lg"
                    className="flex items-center gap-2"
                  >
                    <Play className="h-5 w-5" />
                    Start Radio
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Radio playing screen
          <div className="max-w-4xl w-full space-y-8">
            {/* Now Playing Card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* Album Art */}
                  <div className="w-48 h-48 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {currentTrack?.image ? (
                      <img
                        src={currentTrack.image}
                        alt={currentTrack.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 text-center md:text-left space-y-2">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Radio className="h-3 w-3" />
                        Live Radio
                      </Badge>
                      <Badge variant="outline">
                        Track {currentTrackIndex + 1} of {radioPlaylist.length}
                      </Badge>
                    </div>
                    
                    <h2 className="text-3xl md:text-4xl font-bold line-clamp-2">
                      {currentTrack?.title || 'Loading...'}
                    </h2>
                    
                    <p className="text-xl text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                      <User className="h-5 w-5" />
                      {currentTrack?.artist || 'Unknown Artist'}
                    </p>
                    
                    {currentTrack?.album && (
                      <p className="text-lg text-muted-foreground">
                        {currentTrack.album}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                      {currentTrack?.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDuration(currentTrack.duration)}
                        </span>
                      )}
                      <span>•</span>
                      <span>{selectedGenre === 'all' ? 'All Genres' : selectedGenre}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Radio Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  const shuffledTracks = shuffleArray(radioPlaylist);
                  setRadioPlaylist(shuffledTracks);
                  setCurrentTrackIndex(0);
                }}
                className="flex items-center gap-2"
              >
                <Shuffle className="h-4 w-4" />
                Shuffle
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setIsRadioStarted(false)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Change Station
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Music Player */}
      {currentTrack && isRadioStarted && (
        <div className="fixed bottom-0 left-0 right-0">
          <MusicPlayer
            track={currentTrack}
            autoPlay={isPlaying}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onClose={handleClose}
          />
        </div>
      )}
    </div>
  );
}