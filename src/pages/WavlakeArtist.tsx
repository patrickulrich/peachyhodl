import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWavlakeArtist } from '@/hooks/useWavlake';
import { Music, ExternalLink, Calendar, User, Play, Disc3 } from 'lucide-react';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';

export default function WavlakeArtist() {
  const { artistId } = useParams<{ artistId: string }>();
  const { data: artist, isLoading, error } = useWavlakeArtist(artistId);
  
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
                <Disc3 className="h-5 w-5" />
                Albums ({artist.albums.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {artist.albums.map((album) => (
                  <Card key={album.id} className="group hover:shadow-md transition-all duration-200 overflow-hidden">
                    <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10">
                      {album.albumArtUrl ? (
                        <img 
                          src={album.albumArtUrl} 
                          alt={album.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Disc3 className="h-16 w-16 text-muted-foreground" />
                        </div>
                      )}
                      
                      {/* Play overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Link to={`/album/${album.id}`}>
                          <Button size="lg" className="rounded-full shadow-lg">
                            <Play className="h-6 w-6" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                    
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-lg truncate" title={album.title}>
                            {album.title}
                          </h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(album.releaseDate).getFullYear()}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Link to={`/album/${album.id}`} className="flex-1">
                            <Button variant="outline" className="w-full">
                              <Play className="h-3 w-3 mr-2" />
                              View Album
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm" asChild>
                            <a 
                              href={`https://wavlake.com/album/${album.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View on Wavlake"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {artist.albums.length === 0 && (
                <div className="text-center py-12">
                  <Disc3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Albums Found</h3>
                  <p className="text-muted-foreground mb-4">
                    This artist hasn't released any albums on Wavlake yet.
                  </p>
                  <Button variant="outline" asChild>
                    <a 
                      href={`https://wavlake.com/artist/${artistId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3 w-3 mr-2" />
                      View on Wavlake
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </MainLayout>
  );
}