import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SuggestTrackModal } from './SuggestTrackModal';
import type { MusicTrack } from '@/hooks/useMusicLists';
import { 
  Play, 
  Pause, 
  Clock,
  Music,
  Heart
} from 'lucide-react';

interface TrackListProps {
  tracks: MusicTrack[];
  currentTrackId?: string;
  isPlaying?: boolean;
  onTrackSelect: (track: MusicTrack) => void;
  onTogglePlayPause: (track: MusicTrack) => void;
  onVoteForTrack?: (track: MusicTrack) => void;
  className?: string;
}

export function TrackList({ 
  tracks, 
  currentTrackId, 
  isPlaying, 
  onTrackSelect, 
  onTogglePlayPause,
  onVoteForTrack,
  className 
}: TrackListProps) {
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (tracks.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-12 px-8 text-center">
          <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tracks found</h3>
          <p className="text-muted-foreground">
            No music tracks are available in this list.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="divide-y">
          {tracks.map((track, index) => {
            const isCurrentTrack = track.id === currentTrackId;
            const showPlayButton = hoveredTrack === track.id || isCurrentTrack;
            
            return (
              <div
                key={track.id}
                className={`group p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                  isCurrentTrack ? 'bg-primary/5' : ''
                }`}
                onMouseEnter={() => setHoveredTrack(track.id)}
                onMouseLeave={() => setHoveredTrack(null)}
                onClick={() => onTrackSelect(track)}
              >
                <div className="flex items-center gap-4">
                  {/* Track number / Play button */}
                  <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    {showPlayButton ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePlayPause(track);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        {isCurrentTrack && isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground font-mono">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    )}
                  </div>

                  {/* Track artwork */}
                  <div className="shrink-0">
                    {track.image ? (
                      <img
                        src={track.image}
                        alt={track.title || 'Track artwork'}
                        className="w-12 h-12 rounded object-cover bg-muted"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Music className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Track info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <Link 
                          to={`/wavlake/${track.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`font-medium truncate hover:underline block ${
                            isCurrentTrack ? 'text-primary' : 'hover:text-primary'
                          }`}
                        >
                          {track.title || 'Unknown Track'}
                        </Link>
                        <p className="text-sm text-muted-foreground truncate">
                          {track.artist || 'Unknown Artist'}
                        </p>
                        {track.album && (
                          <p className="text-xs text-muted-foreground truncate">
                            {track.album}
                          </p>
                        )}
                      </div>

                      {/* Track metadata */}
                      <div className="flex items-center gap-3 shrink-0">
                        {track.genre && (
                          <Badge variant="outline" className="text-xs">
                            {track.genre}
                          </Badge>
                        )}
                        
                        {(track.duration || track.publishedAt) && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {track.duration && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(track.duration)}
                              </span>
                            )}
                            
                            {track.publishedAt && (
                              <span>
                                {formatDate(track.publishedAt)}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Suggest to Peachy button */}
                        <SuggestTrackModal 
                          track={track}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        />

                        {/* Vote for track button */}
                        {onVoteForTrack && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              onVoteForTrack(track);
                            }}
                            title="Vote for Top Track"
                          >
                            <Heart className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Track description (if available and short) */}
                    {track.description && track.description.length < 100 && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {track.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Waveform visualization (if available) */}
                {track.waveform && (
                  <div className="mt-3 ml-12">
                    <div className="h-8 bg-muted rounded overflow-hidden">
                      <img
                        src={track.waveform}
                        alt="Waveform"
                        className="w-full h-full object-cover opacity-60"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}