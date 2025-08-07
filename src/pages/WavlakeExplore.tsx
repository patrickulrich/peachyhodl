import { useState, useCallback } from 'react';
import { useSeoMeta } from '@unhead/react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useWavlakeSearch, useWavlakeRankings, useWavlakeArtist, useWavlakeAlbum } from '@/hooks/useWavlake';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { 
  Search, 
  TrendingUp, 
  Filter, 
  Music, 
  User, 
  Disc3, 
  ArrowLeft, 
  ExternalLink, 
  Plus,
  Play
} from 'lucide-react';
import type { MusicTrack } from '@/hooks/useMusicLists';
import type { WavlakeTrack } from '@/lib/wavlake';
import { Link } from 'react-router-dom';
import { MusicPlayer } from '@/components/music/MusicPlayer';

// Peachy's pubkey
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

export default function WavlakeExplore() {
  useSeoMeta({
    title: 'Explore Wavlake - Discover Bitcoin Music',
    description: 'Discover trending Bitcoin music, search artists and albums on Wavlake.',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [drillDownMode, setDrillDownMode] = useState<'trending' | 'search' | 'artist' | 'album'>('trending');
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [isAddingTrack, setIsAddingTrack] = useState(false);
  
  // Music player state
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackList, setCurrentTrackList] = useState<MusicTrack[]>([]);

  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  
  const isPeachy = user?.pubkey === PEACHY_PUBKEY;

  // Search and trending data
  const { data: searchResults = [], isLoading: isSearching, refetch: searchTracks } = useWavlakeSearch(searchQuery, false);
  const { data: trendingTracks = [], isLoading: isLoadingTrending, refetch: refetchTrending } = useWavlakeRankings({
    sort: 'sats',
    days: selectedDays,
    genre: selectedGenre === 'all' ? undefined : selectedGenre,
    limit: 50,
  });

  // Artist/Album drill-down data
  const { data: artistData, isLoading: isLoadingArtist } = useWavlakeArtist(selectedArtistId || undefined);
  const { data: albumData, isLoading: isLoadingAlbum } = useWavlakeAlbum(selectedAlbumId || undefined);

  // Popular genres for filtering
  const genres = [
    'Rock', 'Pop', 'Hip-Hop', 'Electronic', 'Folk', 'Jazz', 'Classical', 
    'Blues', 'Country', 'Reggae', 'Punk', 'Metal', 'R&B', 'Alternative', 
    'Indie', 'Ambient', 'Techno', 'House', 'Experimental'
  ];

  // Handle search
  const handleSearch = () => {
    if (searchQuery.trim()) {
      setDrillDownMode('search');
      setSelectedArtistId(null);
      setSelectedAlbumId(null);
      searchTracks();
    }
  };

  // Handle artist drill-down
  const handleSelectArtist = (artistId: string) => {
    setSelectedArtistId(artistId);
    setSelectedAlbumId(null);
    setDrillDownMode('artist');
  };

  // Handle album drill-down
  const handleSelectAlbum = (albumId: string) => {
    setSelectedAlbumId(albumId);
    setSelectedArtistId(null);
    setDrillDownMode('album');
  };

  // Go back to trending/search
  const handleBackToMain = () => {
    if (searchQuery.trim()) {
      setDrillDownMode('search');
    } else {
      setDrillDownMode('trending');
    }
    setSelectedArtistId(null);
    setSelectedAlbumId(null);
  };

  // Convert WavlakeTrack to MusicTrack format
  const convertToMusicTrack = useCallback((wavlakeTrack: WavlakeTrack): MusicTrack => ({
    id: wavlakeTrack.id,
    title: wavlakeTrack.title,
    artist: wavlakeTrack.artist,
    album: wavlakeTrack.albumTitle,
    duration: wavlakeTrack.duration,
    image: wavlakeTrack.albumArtUrl || wavlakeTrack.artistArtUrl,
    mediaUrl: wavlakeTrack.mediaUrl,
    albumArtUrl: wavlakeTrack.albumArtUrl,
    artistArtUrl: wavlakeTrack.artistArtUrl,
    artistId: wavlakeTrack.artistId,
    albumId: wavlakeTrack.albumId,
    artistNpub: wavlakeTrack.artistNpub,
    msatTotal: wavlakeTrack.msatTotal,
    releaseDate: wavlakeTrack.releaseDate,
    description: `Track from ${wavlakeTrack.artist} • Album: ${wavlakeTrack.albumTitle}`,
    publishedAt: new Date(wavlakeTrack.releaseDate).getTime() / 1000,
    urls: [{
      url: wavlakeTrack.mediaUrl,
      mimeType: 'audio/mpeg',
      quality: 'stream'
    }],
    createdAt: Math.floor(Date.now() / 1000),
    pubkey: wavlakeTrack.artistNpub,
  }), []);

  // Add track to Peachy's picks
  const addTrackToPicks = useCallback(async (track: MusicTrack) => {
    if (!isPeachy) return;

    try {
      setIsAddingTrack(true);
      
      const { addTrackToPicksSimple } = await import('@/lib/addTrackToPicks');
      await addTrackToPicksSimple(track, publishEvent, toast, queryClient);

    } finally {
      setIsAddingTrack(false);
    }
  }, [isPeachy, publishEvent, toast, queryClient]);

  // Music player functions
  const playTrack = useCallback((track: MusicTrack, trackList: MusicTrack[] = []) => {
    setCurrentTrack(track);
    setCurrentTrackList(trackList.length > 0 ? trackList : [track]);
    setIsPlaying(true);
  }, []);

  const handleNext = useCallback(() => {
    if (!currentTrack || currentTrackList.length === 0) return;
    
    const currentIndex = currentTrackList.findIndex(t => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % currentTrackList.length;
    setCurrentTrack(currentTrackList[nextIndex]);
    setIsPlaying(true);
  }, [currentTrack, currentTrackList]);

  const handlePrevious = useCallback(() => {
    if (!currentTrack || currentTrackList.length === 0) return;
    
    const currentIndex = currentTrackList.findIndex(t => t.id === currentTrack.id);
    const prevIndex = currentIndex === 0 ? currentTrackList.length - 1 : currentIndex - 1;
    setCurrentTrack(currentTrackList[prevIndex]);
    setIsPlaying(true);
  }, [currentTrack, currentTrackList]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
            <Music className="h-10 w-10 text-primary" />
            Explore Wavlake
          </h1>
          <p className="text-lg text-muted-foreground">
            Discover trending Bitcoin music, explore artists, and find your next favorite track.
          </p>
        </div>

        <Tabs defaultValue="discover" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
          </TabsList>
          
          <TabsContent value="discover" className="space-y-6">
            {/* Trending Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Trending Tracks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 items-end mb-6">
                  <div className="flex-1">
                    <Label htmlFor="genre-filter">Genre Filter</Label>
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
                  <div className="flex-1">
                    <Label htmlFor="days-filter">Time Period</Label>
                    <Select value={selectedDays.toString()} onValueChange={(value) => setSelectedDays(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Last 24 hours</SelectItem>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="90">Last 3 months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => refetchTrending()} disabled={isLoadingTrending}>
                    <Filter className="h-4 w-4 mr-1" />
                    Apply Filters
                  </Button>
                </div>

                {/* Trending Results - Full Height */}
                <div className="min-h-[60vh]">
                  <div className="grid gap-3">
                    {isLoadingTrending ? (
                      Array.from({ length: 10 }).map((_, i) => (
                        <Card key={i}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <Skeleton className="w-12 h-12 rounded" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-32" />
                              </div>
                              <Skeleton className="h-8 w-20" />
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : trendingTracks.length > 0 ? (
                      trendingTracks.map((track, index) => {
                        const musicTrack = convertToMusicTrack(track);
                        const isCurrentTrack = currentTrack?.id === track.id;
                        const trackIsPlaying = isCurrentTrack && isPlaying;
                        
                        return (
                          <Card key={track.id} className={`group hover:shadow-md transition-all duration-200 ${
                            isCurrentTrack ? 'ring-2 ring-primary/20 bg-primary/5' : ''
                          }`}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium text-primary">
                                  {index + 1}
                                </div>
                                <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center overflow-hidden relative group">
                                  {track.albumArtUrl || track.artistArtUrl ? (
                                    <img 
                                      src={track.albumArtUrl || track.artistArtUrl} 
                                      alt={track.title} 
                                      className="w-full h-full object-cover" 
                                    />
                                  ) : (
                                    <Music className="h-7 w-7 text-muted-foreground" />
                                  )}
                                  
                                  {/* Play overlay */}
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button
                                      size="sm"
                                      className="rounded-full h-8 w-8 p-0"
                                      onClick={() => playTrack(musicTrack, trendingTracks.map(convertToMusicTrack))}
                                    >
                                      {trackIsPlaying ? (
                                        <div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <Play className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className={`font-medium truncate ${isCurrentTrack ? 'text-primary' : ''}`}>
                                    {track.title}
                                  </h4>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {track.artist} {track.albumTitle && `• ${track.albumTitle}`}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline" className="text-xs">
                                      {Math.floor(parseInt(track.msatTotal) / 1000)} sats
                                    </Badge>
                                    {track.duration && (
                                      <Badge variant="outline" className="text-xs">
                                        {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant={trackIsPlaying ? "default" : "outline"}
                                    onClick={() => playTrack(musicTrack, trendingTracks.map(convertToMusicTrack))}
                                  >
                                    {trackIsPlaying ? (
                                      <div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin mr-2" />
                                    ) : (
                                      <Play className="h-3 w-3 mr-2" />
                                    )}
                                    {trackIsPlaying ? 'Playing' : 'Play'}
                                  </Button>
                                  <Button size="sm" variant="ghost" asChild>
                                    <a 
                                      href={`https://wavlake.com/track/${track.id}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      title="View on Wavlake"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </Button>
                                  {isPeachy && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => addTrackToPicks(musicTrack)}
                                      disabled={isAddingTrack}
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add to Picks
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    ) : (
                      <Card>
                        <CardContent className="p-12 text-center">
                          <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-xl font-semibold mb-2">No Trending Tracks</h3>
                          <p className="text-muted-foreground">
                            No tracks found for the selected filters. Try adjusting your criteria.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            {/* Search Header */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Wavlake
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Search for tracks, artists, or albums..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      />
                    </div>
                    <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Breadcrumb for drill-down */}
                  {(drillDownMode === 'artist' || drillDownMode === 'album') && (
                    <div className="flex items-center gap-2 text-sm">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleBackToMain}
                        className="p-1 h-auto"
                      >
                        <ArrowLeft className="h-3 w-3 mr-1" />
                        Back to search
                      </Button>
                      <span className="text-muted-foreground">•</span>
                      {drillDownMode === 'artist' && artistData && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {artistData.name}
                        </span>
                      )}
                      {drillDownMode === 'album' && albumData && (
                        <span className="flex items-center gap-1">
                          <Disc3 className="h-3 w-3" />
                          {albumData.title}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Search Results */}
            <Card>
              <CardContent className="p-6">
                <div className="min-h-[60vh]">
                  <div className="space-y-3">
                    {/* Search Results */}
                    {drillDownMode === 'search' && (
                      <>
                        {isSearching ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-3">
                              <Skeleton className="w-12 h-12 rounded" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-32" />
                              </div>
                              <Skeleton className="h-8 w-20" />
                            </div>
                          ))
                        ) : searchResults.length > 0 ? (
                          searchResults.map((result) => (
                            <div key={result.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors">
                              <div className="w-12 h-12 bg-muted rounded flex items-center justify-center overflow-hidden">
                                {result.albumArtUrl || result.artistArtUrl ? (
                                  <img 
                                    src={result.albumArtUrl || result.artistArtUrl} 
                                    alt={result.name} 
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <Music className="h-6 w-6 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">{result.title || result.name}</h4>
                                <p className="text-sm text-muted-foreground truncate">
                                  {result.artist} {result.albumTitle && `• ${result.albumTitle}`}
                                </p>
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {result.type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" asChild>
                                  <a 
                                    href={`https://wavlake.com/${result.type}/${result.id}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </Button>
                                {result.type === 'artist' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSelectArtist(result.id)}
                                  >
                                    <User className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                )}
                                {result.type === 'album' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSelectAlbum(result.id)}
                                  >
                                    <Disc3 className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                )}
                                {result.type === 'track' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={async () => {
                                        try {
                                          const { wavlakeAPI } = await import('@/lib/wavlake');
                                          const track = await wavlakeAPI.getTrack(result.id);
                                          const musicTrack = convertToMusicTrack(track);
                                          playTrack(musicTrack);
                                        } catch {
                                          toast({
                                            title: 'Failed to Play Track',
                                            description: 'Could not load track details.',
                                            variant: 'destructive',
                                          });
                                        }
                                      }}
                                    >
                                      <Play className="h-3 w-3 mr-1" />
                                      Play
                                    </Button>
                                    {isPeachy && (
                                      <Button
                                        size="sm"
                                        onClick={async () => {
                                          try {
                                            const { wavlakeAPI } = await import('@/lib/wavlake');
                                            const track = await wavlakeAPI.getTrack(result.id);
                                            const musicTrack = convertToMusicTrack(track);
                                            await addTrackToPicks(musicTrack);
                                          } catch {
                                            toast({
                                              title: 'Failed to Add Track',
                                              description: 'Could not fetch track details.',
                                              variant: 'destructive',
                                            });
                                          }
                                        }}
                                        disabled={isAddingTrack}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add to Picks
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          ))
                        ) : searchQuery ? (
                          <div className="text-center py-8">
                            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="font-semibold mb-2">No Results</h3>
                            <p className="text-muted-foreground">
                              No results found for "{searchQuery}". Try different keywords.
                            </p>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="font-semibold mb-2">Search Wavlake</h3>
                            <p className="text-muted-foreground">
                              Enter a search term to find tracks, artists, and albums.
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Artist Albums */}
                    {drillDownMode === 'artist' && (
                      <>
                        {isLoadingArtist ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-3">
                              <Skeleton className="w-12 h-12 rounded" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-32" />
                              </div>
                              <Skeleton className="h-8 w-20" />
                            </div>
                          ))
                        ) : artistData ? (
                          artistData.albums.map((album) => (
                            <div key={album.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors">
                              <div className="w-12 h-12 bg-muted rounded flex items-center justify-center overflow-hidden">
                                {album.albumArtUrl ? (
                                  <img 
                                    src={album.albumArtUrl} 
                                    alt={album.title} 
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <Disc3 className="h-6 w-6 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">{album.title}</h4>
                                <p className="text-sm text-muted-foreground truncate">
                                  Album • {new Date(album.releaseDate).getFullYear()}
                                </p>
                                <Badge variant="outline" className="mt-1 text-xs">
                                  album
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" asChild>
                                  <Link to={`/album/${album.id}`}>
                                    <Play className="h-3 w-3 mr-1" />
                                    Play
                                  </Link>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSelectAlbum(album.id)}
                                >
                                  <Disc3 className="h-3 w-3 mr-1" />
                                  View Tracks
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="font-semibold mb-2">Artist Not Found</h3>
                            <p className="text-muted-foreground">
                              Could not load artist information.
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Album Tracks */}
                    {drillDownMode === 'album' && (
                      <>
                        {isLoadingAlbum ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-3">
                              <Skeleton className="w-12 h-12 rounded" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-32" />
                              </div>
                              <Skeleton className="h-8 w-20" />
                            </div>
                          ))
                        ) : albumData?.tracks ? (
                          albumData.tracks.map((track, index) => (
                            <div key={track.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium text-primary">
                                {index + 1}
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
                                <h4 className="font-medium truncate">{track.title}</h4>
                                <p className="text-sm text-muted-foreground truncate">
                                  {track.artist}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {track.duration && (
                                    <Badge variant="outline" className="text-xs">
                                      {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const musicTrack = convertToMusicTrack(track);
                                    const albumTracks = albumData?.tracks.map(convertToMusicTrack) || [];
                                    playTrack(musicTrack, albumTracks);
                                  }}
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  Play
                                </Button>
                                <Button size="sm" variant="ghost" asChild>
                                  <a 
                                    href={`https://wavlake.com/track/${track.id}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    title="View on Wavlake"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </Button>
                                {isPeachy && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => addTrackToPicks(convertToMusicTrack(track))}
                                    disabled={isAddingTrack}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add to Picks
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <Disc3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="font-semibold mb-2">Album Not Found</h3>
                            <p className="text-muted-foreground">
                              Could not load album tracks.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Music Player */}
        {currentTrack && (
          <div className="fixed bottom-4 left-4 right-4 z-50">
            <MusicPlayer
              track={currentTrack}
              autoPlay={isPlaying}
              onNext={currentTrackList.length > 1 ? handleNext : undefined}
              onPrevious={currentTrackList.length > 1 ? handlePrevious : undefined}
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
}