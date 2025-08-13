import React from 'react';
import { Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RelaySelector } from '@/components/RelaySelector';
import { GlobalTrackList } from '@/components/music/GlobalTrackList';
import { ManagePicksDialog } from '@/components/music/ManagePicksDialog';
import { useWavlakePicks, useTracksFromList } from '@/hooks/useMusicLists';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Music, Settings, ExternalLink, Zap, Compass, Monitor } from 'lucide-react';

// Peachy's pubkey for checking if current user is Peachy
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

const WavlakePicks = () => {
  useSeoMeta({
    title: 'Peachy\'s Weekly Wavlake Picks',
    description: 'Discover Peachy\'s favorite Bitcoin music picks from Wavlake.',
  });

  const { user } = useCurrentUser();
  const { data: wavlakeList, isLoading: isListLoading, error: listError } = useWavlakePicks();
  const { data: tracks = [], isLoading: isTracksLoading, error: tracksError } = useTracksFromList(wavlakeList?.tracks || []);

  const isLoading = isListLoading || isTracksLoading;
  const error = listError || tracksError;
  const isPeachy = user?.pubkey === PEACHY_PUBKEY;

  // Data refresh is now handled by React Query invalidation in ManagePicksDialog
  const handleListUpdated = () => {
    // No need to do anything here - the ManagePicksDialog handles cache invalidation
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
                <Music className="h-10 w-10 text-primary" />
                Peachy's Weekly Wavlake Picks
              </h1>
              <p className="text-lg text-muted-foreground">
                Discover Peachy's favorite Bitcoin music from Wavlake, powered by Nostr lists.
              </p>
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Manage button for Peachy only */}
              {isPeachy && (
                <ManagePicksDialog 
                  currentList={wavlakeList || undefined}
                  currentTracks={tracks}
                  onListUpdated={handleListUpdated}
                >
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Manage List
                  </Button>
                </ManagePicksDialog>
              )}
              
              {/* Party View button - visible to everyone but only when tracks exist */}
              {tracks.length > 0 && (
                <Button variant="outline" asChild>
                  <Link to="/party-view" className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Party View
                  </Link>
                </Button>
              )}
              
              {/* Explore Wavlake button - visible to everyone */}
              <Button variant="outline" asChild>
                <Link to="/explore-wavlake" className="flex items-center gap-2">
                  <Compass className="h-4 w-4" />
                  Explore Wavlake
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-8">
            {/* List info skeleton */}
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-96 mb-4" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>

            {/* Current player skeleton */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-16 h-16 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Track list skeleton */}
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-4 flex items-center gap-4">
                      <Skeleton className="w-8 h-8" />
                      <Skeleton className="w-12 h-12 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : error ? (
          <Card className="border-dashed">
            <CardContent className="py-12 px-8 text-center">
              <div className="max-w-sm mx-auto space-y-6">
                <p className="text-muted-foreground">
                  Failed to load Wavlake picks. Try another relay?
                </p>
                <RelaySelector className="w-full" />
              </div>
            </CardContent>
          </Card>
        ) : !wavlakeList ? (
          <Card className="border-dashed">
            <CardContent className="py-12 px-8 text-center">
              <div className="max-w-sm mx-auto space-y-6">
                <Music className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">No Wavlake picks yet</h3>
                  <p className="text-muted-foreground">
                    Peachy hasn't created any Wavlake music lists yet. Check back soon for amazing Bitcoin music!
                  </p>
                </div>
                <RelaySelector className="w-full" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* List info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">
                      {wavlakeList.title || 'Peachy\'s Music Picks'}
                    </h2>
                    {wavlakeList.description && (
                      <p className="text-muted-foreground mb-4">
                        {wavlakeList.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{tracks.length} tracks</span>
                      <span>•</span>
                      <span>Updated {formatDate(wavlakeList.updatedAt)}</span>
                    </div>
                  </div>
                  
                  {wavlakeList.image && (
                    <img
                      src={wavlakeList.image}
                      alt={wavlakeList.title || 'Playlist artwork'}
                      className="w-24 h-24 rounded-lg object-cover bg-muted ml-6"
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Track list */}
            {tracks.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Tracks</h3>
                  <Badge variant="secondary">
                    {tracks.length} song{tracks.length === 1 ? '' : 's'}
                  </Badge>
                </div>
                
                <GlobalTrackList tracks={tracks} />
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 px-8 text-center">
                  <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No tracks in list</h3>
                  <p className="text-muted-foreground">
                    This list doesn't contain any playable tracks yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* About Wavlake */}
        <Card className="mt-12">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Music className="h-12 w-12 text-muted-foreground" />
                <Zap className="h-6 w-6 text-yellow-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Support Value for Value Music</h3>
              <p className="text-muted-foreground mb-4 max-w-2xl mx-auto">
                Wavlake is revolutionizing music with Bitcoin and Lightning. Artists get paid directly 
                through zaps, and listeners can support their favorite music instantly using Nostr.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button asChild>
                  <a href="https://wavlake.com" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Explore Wavlake
                  </a>
                </Button>
                
                {wavlakeList && (
                  <Button variant="outline" asChild>
                    <Link to={`/naddr1${wavlakeList.dTag}`}>
                      View on Nostr
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default WavlakePicks;