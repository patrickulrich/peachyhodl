import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { MainLayout } from '@/components/layout/MainLayout';
import { LiveStreamPlayer } from '@/components/livestream/LiveStreamPlayer';
import { LiveChat } from '@/components/livestream/LiveChat';
import { PictureGrid } from '@/components/gallery/PictureGrid';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FollowButton } from '@/components/FollowButton';
import { MusicPlayer } from '@/components/music/MusicPlayer';
import { WavlakeZapDialog } from '@/components/music/WavlakeZapDialog';
import { LiveNextModal } from '@/components/livestream/LiveNextModal';
import { useLiveStream } from '@/hooks/useLiveStream';
import { usePictures } from '@/hooks/usePictures';
import { useWavlakePicks } from '@/hooks/useMusicLists';
import type { MusicTrack } from '@/hooks/useMusicLists';
import { Bitcoin, Sparkles, Music, Play, Pause, Zap } from 'lucide-react';

// Peachy's vanity npub decoded to hex
// npub1peachy0e223un984r54xnu9k93mcjk92mp27zrl03qfmcwpwmqsqt2agsv
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

const Index = () => {
  useSeoMeta({
    title: 'Peachy - Bitcoin is the future and it\'s just peachy',
    description: 'Join Peachy for live streams, photos, and Bitcoin content on Nostr.',
  });

  const { data: liveStreamData } = useLiveStream();
  
  // Check if livestream should show
  const shouldShowLiveStream = liveStreamData?.isLive && liveStreamData?.streamUrl;
  const { data: pictures = [], isLoading: isLoadingPictures } = usePictures(6);
  const { data: wavlakeList, isLoading: isLoadingMusic } = useWavlakePicks();
  
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const featuredTracks = wavlakeList?.tracks?.slice(0, 3) || [];

  const handleTrackPlay = (track: MusicTrack) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const handleClosePlayer = () => {
    setCurrentTrack(null);
    setIsPlaying(false);
  };

  // Generate live event ID for chat
  const liveEventId = liveStreamData?.event
    ? `30311:${liveStreamData.event.pubkey}:${
        liveStreamData.event.tags.find(([t]) => t === "d")?.[1]
      }`
    : null;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Live Stream or Hero Section */}
        {shouldShowLiveStream ? (
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              Live Now
            </h2>
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="h-[500px] lg:h-[400px] xl:h-[500px]">
                  <LiveStreamPlayer
                    streamUrl={liveStreamData.streamUrl!}
                    title={liveStreamData.title}
                    image={liveStreamData.image}
                    participantCount={liveStreamData.participants.length}
                  />
                </div>
              </div>
              <div className="lg:col-span-1">
                <div className="h-[500px] lg:h-[400px] xl:h-[500px]">
                  <LiveChat liveEventId={liveEventId} liveEvent={liveStreamData.event} />
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="mb-12">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 p-12 lg:p-20">
              <div className="relative z-10 max-w-3xl mx-auto text-center">
                <div className="mb-6 flex justify-center">
                  <div className="p-4 bg-primary/10 rounded-full">
                    <Bitcoin className="h-16 w-16 text-primary" />
                  </div>
                </div>
                <h1 className="text-4xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Bitcoin is the future
                </h1>
                <p className="text-2xl lg:text-3xl mb-8 text-foreground/80">
                  and it's just peachy.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <FollowButton 
                    pubkey={PEACHY_PUBKEY}
                    petname="Peachy"
                    size="lg" 
                    className="text-lg px-8"
                  />
                  <LiveNextModal>
                    <Button size="lg" variant="outline" className="text-lg px-8">
                      <Sparkles className="h-5 w-5 mr-2" />
                      Live Next
                    </Button>
                  </LiveNextModal>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
            </div>
          </section>
        )}

        {/* Picture Gallery Section */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Recent Photos</h2>
            <Button variant="outline" asChild>
              <a href="/photos">View All</a>
            </Button>
          </div>
          <PictureGrid 
            pictures={pictures} 
            isLoading={isLoadingPictures}
            columns={3}
          />
        </section>

        {/* Wavlake Picks Section */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Music className="h-6 w-6 text-primary" />
              Peachy's Weekly Wavlake Picks
            </h2>
            <Button variant="outline" asChild>
              <a href="/wavlake-picks">View All</a>
            </Button>
          </div>

          {isLoadingMusic ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="aspect-square rounded-md mb-3" />
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-3" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 flex-1" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredTracks.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredTracks.map((track) => {
                const isCurrentTrack = currentTrack?.id === track.id;
                const trackIsPlaying = isCurrentTrack && isPlaying;

                return (
                  <Card key={track.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      {/* Track artwork */}
                      <div className="aspect-square rounded-md mb-3 overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 relative group">
                        {track.image ? (
                          <img
                            src={track.image}
                            alt={track.title || 'Track artwork'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        
                        {/* Play overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            size="lg"
                            className="rounded-full"
                            onClick={() => handleTrackPlay(track)}
                          >
                            {trackIsPlaying ? (
                              <Pause className="h-6 w-6" />
                            ) : (
                              <Play className="h-6 w-6" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Track info */}
                      <div className="space-y-2">
                        <h3 className="font-semibold truncate" title={track.title}>
                          {track.title || 'Unknown Track'}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate" title={track.artist}>
                          {track.artist || 'Unknown Artist'}
                        </p>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleTrackPlay(track)}
                          >
                            {trackIsPlaying ? (
                              <>
                                <Pause className="h-4 w-4 mr-2" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                Play
                              </>
                            )}
                          </Button>
                          <WavlakeZapDialog track={track}>
                            <Button size="sm" variant="outline" className="px-3">
                              <Zap className="h-4 w-4" />
                            </Button>
                          </WavlakeZapDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 px-8 text-center">
                <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No picks yet</h3>
                <p className="text-muted-foreground">
                  Peachy hasn't shared any music picks yet. Check back soon for amazing Bitcoin music!
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Music Player */}
        {currentTrack && (
          <div className="fixed bottom-4 left-4 right-4 z-50">
            <MusicPlayer
              track={currentTrack}
              autoPlay={isPlaying}
              onNext={featuredTracks.length > 1 ? () => {
                const currentIndex = featuredTracks.findIndex(t => t.id === currentTrack.id);
                const nextIndex = (currentIndex + 1) % featuredTracks.length;
                setCurrentTrack(featuredTracks[nextIndex]);
              } : undefined}
              onPrevious={featuredTracks.length > 1 ? () => {
                const currentIndex = featuredTracks.findIndex(t => t.id === currentTrack.id);
                const prevIndex = currentIndex === 0 ? featuredTracks.length - 1 : currentIndex - 1;
                setCurrentTrack(featuredTracks[prevIndex]);
              } : undefined}
              onClose={handleClosePlayer}
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Index;
