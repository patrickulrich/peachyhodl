import { useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWavlakeArtist } from '@/hooks/useWavlake';
import { Music, ExternalLink, Calendar, User } from 'lucide-react';
import { MusicTrack } from '@/hooks/useMusicLists';
import { MusicPlayer } from '@/components/music/MusicPlayer';
import { useState } from 'react';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';

export default function WavlakeArtist() {
  const { artistId } = useParams<{ artistId: string }>();
  const { data: artist, isLoading, error } = useWavlakeArtist(artistId);
  const [_selectedTrack, _setSelectedTrack] = useState<MusicTrack | null>(null);
  
  // Get Nostr profile if artistNpub is available
  const author = useAuthor(artist?.artistNpub);
  const nostrProfile = author.data?.metadata;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-6">
                <Skeleton className="w-32 h-32 rounded-lg" />
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (error || !artist) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Artist Not Found</h2>
              <p className="text-muted-foreground">
                The requested artist could not be found.
              </p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Artist Profile */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-6">
                <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                  {artist.artistArtUrl ? (
                    <img 
                      src={artist.artistArtUrl} 
                      alt={artist.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-16 w-16 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <CardTitle className="text-3xl">{artist.name}</CardTitle>
                    {nostrProfile && (
                      <p className="text-muted-foreground mt-1">
                        @{nostrProfile.name || genUserName(artist.artistNpub || '')}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">
                      <Music className="h-3 w-3 mr-1" />
                      {artist.albums.length} Album{artist.albums.length !== 1 ? 's' : ''}
                    </Badge>
                    <Button variant="outline" size="sm" asChild>
                      <a 
                        href={`https://wavlake.com/artist/${artistId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View on Wavlake
                      </a>
                    </Button>
                  </div>

                  {artist.bio && (
                    <p className="text-muted-foreground leading-relaxed">
                      {artist.bio}
                    </p>
                  )}

                  {nostrProfile?.about && artist.bio !== nostrProfile.about && (
                    <div className="border-l-2 border-primary/20 pl-4">
                      <p className="text-sm text-muted-foreground mb-1">From Nostr Profile:</p>
                      <p className="text-muted-foreground leading-relaxed">
                        {nostrProfile.about}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Albums */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Albums ({artist.albums.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {artist.albums.map((album) => (
                  <Card key={album.id} className="hover:bg-accent transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-muted rounded flex items-center justify-center overflow-hidden">
                          {album.albumArtUrl ? (
                            <img 
                              src={album.albumArtUrl} 
                              alt={album.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Music className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{album.title}</h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(album.releaseDate).getFullYear()}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a 
                            href={`https://wavlake.com/album/${album.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {artist.albums.length === 0 && (
                <div className="text-center py-8">
                  <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No albums found for this artist.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Music Player */}
          {_selectedTrack && (
            <Card>
              <CardContent className="p-6">
                <MusicPlayer track={_selectedTrack} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}