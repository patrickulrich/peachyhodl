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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useWavlakeSearch } from '@/hooks/useWavlake';
import { Settings, Search, Plus, Trash2, ExternalLink, Music, MoveUp, MoveDown } from 'lucide-react';
import type { MusicTrack, MusicList } from '@/hooks/useMusicLists';

// Peachy's pubkey
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

interface ManagePicksDialogProps {
  currentList?: MusicList;
  currentTracks?: MusicTrack[];
  onListUpdated?: () => void;
  children: React.ReactNode;
}

export function ManagePicksDialog({ 
  currentList, 
  currentTracks = [], 
  onListUpdated, 
  children 
}: ManagePicksDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualTrackId, setManualTrackId] = useState('');
  const [listTitle, setListTitle] = useState('');
  const [listDescription, setListDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [orderedTracks, setOrderedTracks] = useState<MusicTrack[]>([]);
  
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  
  // Search Wavlake tracks
  const { data: searchResults = [], isLoading: isSearching, refetch: searchTracks } = useWavlakeSearch(searchQuery, false);

  // Initialize state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setListTitle(currentList?.title || "Peachy's Weekly Wavlake Picks");
      setListDescription(currentList?.description || "Curated Bitcoin music tracks from Wavlake");
      setOrderedTracks([...currentTracks]);
    }
    setOpen(newOpen);
  };

  // Handle search
  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchTracks();
    }
  };

  // Add track to the list
  const addTrackToList = useCallback((track: MusicTrack) => {
    const isAlreadyAdded = orderedTracks.some(t => t.id === track.id);
    if (isAlreadyAdded) {
      toast({
        title: 'Track Already Added',
        description: 'This track is already in your picks.',
        variant: 'destructive',
      });
      return;
    }

    setOrderedTracks(prev => [...prev, track]);
    toast({
      title: 'Track Added',
      description: `Added "${track.title}" by ${track.artist} to your picks.`,
    });
  }, [orderedTracks, toast]);

  // Remove track from the list
  const removeTrackFromList = useCallback((trackId: string) => {
    setOrderedTracks(prev => prev.filter(t => t.id !== trackId));
    toast({
      title: 'Track Removed',
      description: 'Track removed from your picks.',
    });
  }, [toast]);

  // Move track up in the list
  const moveTrackUp = useCallback((index: number) => {
    if (index === 0) return;
    const newTracks = [...orderedTracks];
    [newTracks[index], newTracks[index - 1]] = [newTracks[index - 1], newTracks[index]];
    setOrderedTracks(newTracks);
  }, [orderedTracks]);

  // Move track down in the list
  const moveTrackDown = useCallback((index: number) => {
    if (index === orderedTracks.length - 1) return;
    const newTracks = [...orderedTracks];
    [newTracks[index], newTracks[index + 1]] = [newTracks[index + 1], newTracks[index]];
    setOrderedTracks(newTracks);
  }, [orderedTracks]);

  // Add track by Wavlake track ID
  const addTrackById = useCallback(async () => {
    if (!manualTrackId.trim()) return;

    try {
      setIsUpdating(true);
      
      // Extract track ID from Wavlake URL if needed
      const actualTrackId = manualTrackId.includes('wavlake.com') 
        ? manualTrackId.split('/').pop()?.split('?')[0] 
        : manualTrackId.trim();
        
      if (!actualTrackId) {
        throw new Error('Invalid track ID or URL');
      }

      // Import the wavlakeAPI here to avoid circular dependencies
      const { wavlakeAPI } = await import('@/lib/wavlake');
      const track = await wavlakeAPI.getTrack(actualTrackId);

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

      addTrackToList(musicTrack);
      setManualTrackId('');
      
    } catch (error) {
      console.error('Failed to add track:', error);
      toast({
        title: 'Failed to Add Track',
        description: 'Could not add the track. Check the track ID or URL.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  }, [manualTrackId, addTrackToList, toast]);

  // Save the updated list
  const saveList = useCallback(async () => {
    if (!user || user.pubkey !== PEACHY_PUBKEY) return;

    try {
      setIsUpdating(true);
      
      // Create track references (using Wavlake track IDs)
      const trackRefs = orderedTracks.map(track => track.id);

      // Publish updated NIP-51 curation set (kind 30004)
      await publishEvent({
        kind: 30004, // NIP-51 Curation Set
        content: listDescription,
        tags: [
          ['d', 'wavlake-picks'], // Identifier for the list
          ['title', listTitle],
          ['description', listDescription],
          ...trackRefs.map(trackId => ['r', trackId]), // Reference tracks by ID
          ...(currentList?.image ? [['image', currentList.image]] : []),
        ],
      });

      toast({
        title: 'List Updated',
        description: 'Your Wavlake picks have been saved successfully.',
      });

      // Invalidate relevant queries to refresh the data
      await queryClient.invalidateQueries({
        queryKey: ['wavlake-picks', PEACHY_PUBKEY]
      });
      
      onListUpdated?.();
      setOpen(false);
      
    } catch (error) {
      console.error('Failed to save list:', error);
      toast({
        title: 'Failed to Save List',
        description: 'Could not save your picks. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  }, [user, orderedTracks, listTitle, listDescription, currentList?.image, publishEvent, toast, queryClient, onListUpdated]);

  // Only show for Peachy
  if (!user || user.pubkey !== PEACHY_PUBKEY) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="current">Current List ({orderedTracks.length})</TabsTrigger>
            <TabsTrigger value="search">Search Tracks</TabsTrigger>
            <TabsTrigger value="manual">Add by ID</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="current" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Current Tracks</h3>
                <Badge variant="secondary">{orderedTracks.length} tracks</Badge>
              </div>
              
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {orderedTracks.length > 0 ? (
                    orderedTracks.map((track, index) => (
                      <Card key={track.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center overflow-hidden">
                              {track.image ? (
                                <img src={track.image} alt={track.title} className="w-full h-full object-cover" />
                              ) : (
                                <Music className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{track.title}</h4>
                              <p className="text-sm text-muted-foreground truncate">
                                {track.artist} {track.album && `• ${track.album}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => moveTrackUp(index)}
                                  disabled={index === 0 || isUpdating}
                                  className="h-6 w-6 p-0"
                                >
                                  <MoveUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => moveTrackDown(index)}
                                  disabled={index === orderedTracks.length - 1 || isUpdating}
                                  className="h-6 w-6 p-0"
                                >
                                  <MoveDown className="h-3 w-3" />
                                </Button>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                              >
                                <a 
                                  href={`https://wavlake.com/track/${track.id}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => removeTrackFromList(track.id)}
                                disabled={isUpdating}
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
                          Add tracks using the search or manual tabs.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

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
                  <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="h-96">
              <div className="space-y-2">
                {isSearching ? (
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
                  searchResults.map((result) => (
                    <Card key={result.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
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
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                            >
                              <a 
                                href={`https://wavlake.com/${result.type}/${result.id}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                            {result.type === 'track' && (
                              <Button
                                size="sm"
                                onClick={async () => {
                                  // Convert search result to MusicTrack and add
                                  const { wavlakeAPI } = await import('@/lib/wavlake');
                                  try {
                                    const track = await wavlakeAPI.getTrack(result.id);
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
                                    addTrackToList(musicTrack);
                                  } catch {
                                    toast({
                                      title: 'Failed to Add Track',
                                      description: 'Could not fetch track details.',
                                      variant: 'destructive',
                                    });
                                  }
                                }}
                                disabled={isUpdating}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add
                              </Button>
                            )}
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
                <Label htmlFor="manual-track-id">Wavlake Track ID or URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="manual-track-id"
                    placeholder="Track ID or https://wavlake.com/track/..."
                    value={manualTrackId}
                    onChange={(e) => setManualTrackId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTrackById()}
                  />
                  <Button 
                    onClick={addTrackById} 
                    disabled={isUpdating || !manualTrackId.trim()}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Add Track by ID</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Enter a Wavlake track ID or paste a track URL to add it to your picks.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Example: <code>abc123</code> or <code>https://wavlake.com/track/abc123</code>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="list-title">List Title</Label>
                <Input
                  id="list-title"
                  value={listTitle}
                  onChange={(e) => setListTitle(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="list-description">Description</Label>
                <Textarea
                  id="list-description"
                  value={listDescription}
                  onChange={(e) => setListDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={saveList} 
            disabled={isUpdating || orderedTracks.length === 0}
          >
            {isUpdating ? 'Saving...' : 'Save List'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}