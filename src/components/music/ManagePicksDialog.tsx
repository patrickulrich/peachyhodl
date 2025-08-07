import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Settings, Search, Plus, Trash2, ExternalLink, Music } from 'lucide-react';
import type { MusicTrack, MusicList } from '@/hooks/useMusicLists';

// Peachy's pubkey
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

// Parse Wavlake-style music track (kind 32123 with NOM spec in content)
function parseMusicTrack(event: NostrEvent): MusicTrack | null {
  // Only handle Wavlake's kind 32123 events
  if (event.kind !== 32123) return null;

  try {
    // Parse the NOM (Nostr Open Media) spec from content field
    const nomData = JSON.parse(event.content);
    
    // Extract data from NOM spec
    const title = nomData.title;
    const artist = nomData.creator;
    const duration = nomData.duration;
    const publishedAt = nomData.published_at ? parseInt(nomData.published_at) : undefined;
    const enclosureUrl = nomData.enclosure; // The actual media file URL
    const mimeType = nomData.type;

    // Build URLs array
    const urls: Array<{ url: string; mimeType?: string; quality?: string; }> = [];
    
    if (enclosureUrl) {
      urls.push({ 
        url: enclosureUrl, 
        mimeType: mimeType || 'audio/mpeg', 
        quality: 'stream' 
      });
    }

    // If no media URL found, skip this track
    if (urls.length === 0) return null;

    // Look for additional metadata in tags (fallback)
    const album = event.tags.find(([tag]: [string]) => tag === 'album')?.[1];
    const genre = event.tags.find(([tag]: [string]) => tag === 'genre')?.[1];
    const image = event.tags.find(([tag]: [string]) => tag === 'image')?.[1];

    return {
      id: event.id,
      title: title || 'Untitled',
      artist: artist || 'Unknown Artist',
      album,
      duration,
      genre,
      urls,
      image,
      waveform: undefined,
      description: nomData.guid || undefined,
      publishedAt,
      createdAt: event.created_at,
      pubkey: event.pubkey,
    };
  } catch (error) {
    console.error('Failed to parse music track event:', error);
    return null;
  }
}

interface ManagePicksDialogProps {
  children: React.ReactNode;
  currentList?: MusicList;
  currentTracks: MusicTrack[];
  onListUpdated?: () => void;
}

export function ManagePicksDialog({ 
  children, 
  currentList, 
  currentTracks,
  onListUpdated 
}: ManagePicksDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  const { nostr } = useNostr();

  // Search for music tracks on Nostr
  const searchWavlakeTracks = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const signal = AbortSignal.timeout(5000);
      
      // Search for kind 32123 music events that match the query
      const musicEvents = await nostr.query([{
        kinds: [32123],
        limit: 50,
        since: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60), // Last 30 days
      }], { signal });

      // Parse and filter tracks that match the search query
      const allTracks = musicEvents
        .map(parseMusicTrack)
        .filter((track): track is MusicTrack => track !== null);

      // Filter tracks by search query (case insensitive)
      const filteredTracks = allTracks.filter(track => {
        const searchLower = query.toLowerCase();
        return (
          track.title?.toLowerCase().includes(searchLower) ||
          track.artist?.toLowerCase().includes(searchLower) ||
          track.album?.toLowerCase().includes(searchLower) ||
          track.genre?.toLowerCase().includes(searchLower)
        );
      });

      setSearchResults(filteredTracks.slice(0, 20)); // Limit to 20 results
      
      toast({
        title: 'Search Complete',
        description: `Found ${filteredTracks.length} tracks matching "${query}"`
      });
      
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: 'Search Failed',
        description: 'Could not search Nostr music tracks. Please try again.',
        variant: 'destructive',
      });
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast, nostr]);

  // Add track to the list
  const addTrackToList = useCallback(async (track: MusicTrack) => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Check if track is already in the list
      const isAlreadyAdded = currentTracks.some(t => t.id === track.id);
      if (isAlreadyAdded) {
        toast({
          title: 'Track Already Added',
          description: 'This track is already in your Wavlake picks.',
          variant: 'destructive',
        });
        return;
      }

      // Create updated track list - reference the actual music event
      // We need to find the kind 1 event that references this kind 32123 track
      // For now, we'll reference the track event ID directly
      const updatedTracks = [...(currentList?.tracks || []), track.id];

      // Publish updated NIP-51 curation set (kind 30004)
      await publishEvent({
        kind: 30004, // NIP-51 Curation Set
        content: currentList?.description || 'Peachy\'s curated Bitcoin music picks from Wavlake',
        tags: [
          ['d', 'wavlake-picks'], // Identifier for the list (matches useWavlakePicks query)
          ['title', 'Peachy\'s Weekly Wavlake Picks'],
          ['description', currentList?.description || 'Peachy\'s curated Bitcoin music picks from Wavlake'],
          ...updatedTracks.map(trackRef => {
            // If it looks like an event ID, use e tag, otherwise r tag for URLs
            return trackRef.startsWith('http') ? ['r', trackRef] : ['e', trackRef];
          }),
          ...(currentList?.image ? [['image', currentList.image]] : []),
        ],
      });

      toast({
        title: 'Track Added',
        description: `Added "${track.title}" by ${track.artist} to your Wavlake picks.`,
      });

      // Invalidate relevant queries to refresh the data
      await queryClient.invalidateQueries({
        queryKey: ['wavlake-picks', PEACHY_PUBKEY]
      });
      
      onListUpdated?.();
      
    } catch (error) {
      console.error('Failed to add track:', error);
      toast({
        title: 'Failed to Add Track',
        description: 'Could not add the track to your list. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, currentList, currentTracks, publishEvent, toast, onListUpdated, queryClient]);

  // Remove track from the list
  const removeTrackFromList = useCallback(async (track: MusicTrack) => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Create updated track list without this track
      const updatedTracks = (currentList?.tracks || []).filter(trackRef => trackRef !== track.id);

      // Publish updated NIP-51 curation set (kind 30004)
      await publishEvent({
        kind: 30004, // NIP-51 Curation Set
        content: currentList?.description || 'Peachy\'s curated Bitcoin music picks from Wavlake',
        tags: [
          ['d', 'wavlake-picks'], // Identifier for the list (matches useWavlakePicks query)
          ['title', 'Peachy\'s Weekly Wavlake Picks'],
          ['description', currentList?.description || 'Peachy\'s curated Bitcoin music picks from Wavlake'],
          ...updatedTracks.map(trackRef => {
            // If it looks like an event ID, use e tag, otherwise r tag for URLs
            return trackRef.startsWith('http') ? ['r', trackRef] : ['e', trackRef];
          }),
          ...(currentList?.image ? [['image', currentList.image]] : []),
        ],
      });

      toast({
        title: 'Track Removed',
        description: `Removed "${track.title}" by ${track.artist} from your Wavlake picks.`,
      });

      // Invalidate relevant queries to refresh the data
      await queryClient.invalidateQueries({
        queryKey: ['wavlake-picks', PEACHY_PUBKEY]
      });
      
      onListUpdated?.();
      
    } catch (error) {
      console.error('Failed to remove track:', error);
      toast({
        title: 'Failed to Remove Track',
        description: 'Could not remove the track from your list. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, currentList, publishEvent, toast, onListUpdated, queryClient]);

  // Add track by URL
  const addTrackByUrl = useCallback(async (url: string) => {
    if (!user || !url.trim()) return;

    try {
      setIsLoading(true);
      
      // Check if URL is already in the list
      const isAlreadyAdded = (currentList?.tracks || []).includes(url);
      if (isAlreadyAdded) {
        toast({
          title: 'URL Already Added',
          description: 'This URL is already in your Wavlake picks.',
          variant: 'destructive',
        });
        return;
      }

      // Create updated track list
      const updatedTracks = [...(currentList?.tracks || []), url];

      // Publish updated NIP-51 curation set (kind 30004)
      await publishEvent({
        kind: 30004, // NIP-51 Curation Set
        content: currentList?.description || 'Peachy\'s curated Bitcoin music picks from Wavlake',
        tags: [
          ['d', 'wavlake-picks'], // Identifier for the list (matches useWavlakePicks query)
          ['title', 'Peachy\'s Weekly Wavlake Picks'],
          ['description', currentList?.description || 'Peachy\'s curated Bitcoin music picks from Wavlake'],
          ...updatedTracks.map(trackUrl => ['r', trackUrl]), // URLs as r tags for now
          ...(currentList?.image ? [['image', currentList.image]] : []),
        ],
      });

      setManualUrl(''); // Clear the input

      toast({
        title: 'Track Added',
        description: 'Successfully added track URL to your Wavlake picks.',
      });

      // Invalidate relevant queries to refresh the data
      await queryClient.invalidateQueries({
        queryKey: ['wavlake-picks', PEACHY_PUBKEY]
      });
      
      onListUpdated?.();
      
    } catch (error) {
      console.error('Failed to add track URL:', error);
      toast({
        title: 'Failed to Add URL',
        description: 'Could not add the track URL to your list. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, currentList, publishEvent, toast, onListUpdated, queryClient]);

  const handleSearch = () => {
    searchWavlakeTracks(searchQuery);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Manage Wavlake Picks
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="search">Search Tracks</TabsTrigger>
            <TabsTrigger value="manual">Add URL</TabsTrigger>
            <TabsTrigger value="current">Current List ({currentTracks.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="search" className="space-y-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="search">Search Wavlake</Label>
                  <Input
                    id="search"
                    placeholder="Search for tracks, artists, or albums..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleSearch} disabled={isLoading || !searchQuery.trim()}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>How to add tracks:</strong>
                </p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Search for tracks using the search box above</li>
                  <li>Or manually add Wavlake track URLs in the manual section below</li>
                  <li>Click "Add to List" to include them in your weekly picks</li>
                </ol>
              </div>
            </div>

            <ScrollArea className="h-96">
              <div className="space-y-2">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
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
                ) : searchResults.length > 0 ? (
                  searchResults.map((track) => (
                    <Card key={track.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                            <Music className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{track.title}</h4>
                            <p className="text-sm text-muted-foreground truncate">
                              {track.artist} • {track.album || 'Single'}
                            </p>
                            {track.genre && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                {track.genre}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {track.urls[0]?.url && (
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                              >
                                <a href={track.urls[0].url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => addTrackToList(track)}
                              disabled={isLoading}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : searchQuery ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">No Results</h3>
                      <p className="text-muted-foreground">
                        No tracks found for "{searchQuery}". Try different keywords.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">Search Wavlake</h3>
                      <p className="text-muted-foreground">
                        Enter a search term to find tracks to add to your picks.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual-url">Wavlake Track URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="manual-url"
                    placeholder="https://wavlake.com/track/..."
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTrackByUrl(manualUrl)}
                  />
                  <Button 
                    onClick={() => addTrackByUrl(manualUrl)} 
                    disabled={isLoading || !manualUrl.trim()}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>How to find track URLs:</strong>
                </p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Go to <a href="https://wavlake.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Wavlake.com</a></li>
                  <li>Find the track you want to add</li>
                  <li>Copy the track's URL from your browser</li>
                  <li>Paste it in the field above and click "Add"</li>
                </ol>
              </div>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Manual Track Addition</h3>
                    <p className="text-muted-foreground text-sm">
                      Paste any Wavlake track URL above to add it directly to your picks list.
                      This is useful when you know exactly which tracks you want to feature.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="current" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Current Tracks</h3>
              <Badge variant="secondary">{currentTracks.length} tracks</Badge>
            </div>
            
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {currentTracks.length > 0 ? (
                  currentTracks.map((track, index) => (
                    <Card key={track.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                            <Music className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{track.title}</h4>
                            <p className="text-sm text-muted-foreground truncate">
                              {track.artist} • {track.album || 'Single'}
                            </p>
                            {track.genre && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                {track.genre}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {track.urls[0]?.url && (
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                              >
                                <a href={track.urls[0].url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeTrackFromList(track)}
                              disabled={isLoading}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">No Tracks Yet</h3>
                      <p className="text-muted-foreground">
                        Your Wavlake picks list is empty. Add some tracks to get started!
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}