import { useCallback } from 'react';
import { TrackList } from './TrackList';
import { useGlobalMusicPlayer } from '@/hooks/useGlobalMusicPlayer';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import type { MusicTrack } from '@/hooks/useMusicLists';

interface GlobalTrackListProps {
  tracks: MusicTrack[];
  className?: string;
}

export function GlobalTrackList({ tracks, className }: GlobalTrackListProps) {
  const { playTrack, togglePlay, currentTrack, isPlaying, isTrackCurrent } = useGlobalMusicPlayer();
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const { toast } = useToast();

  const handleTrackSelect = useCallback((track: MusicTrack) => {
    playTrack(track, tracks);
  }, [playTrack, tracks]);

  const handleTogglePlayPause = useCallback((track: MusicTrack) => {
    if (isTrackCurrent(track.id)) {
      togglePlay();
    } else {
      playTrack(track, tracks);
    }
  }, [isTrackCurrent, togglePlay, playTrack, tracks]);

  const handleVoteForTrack = useCallback((track: MusicTrack) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to vote for tracks.",
        variant: "destructive",
      });
      return;
    }

    // Create a kind 30003 bookmark set for voting
    createEvent({
      kind: 30003,
      content: '',
      tags: [
        ['d', 'peachy-song-vote'],
        ['title', 'Peachy Song Vote'],
        ['a', `32123:${track.pubkey}:${track.id}`],
        ['e', track.id],
      ],
    });

    toast({
      title: "Vote Recorded!",
      description: `You voted for "${track.title}" by ${track.artist}`,
    });
  }, [user, createEvent, toast]);

  return (
    <TrackList
      tracks={tracks}
      currentTrackId={currentTrack?.id}
      isPlaying={currentTrack ? isPlaying : false}
      onTrackSelect={handleTrackSelect}
      onTogglePlayPause={handleTogglePlayPause}
      onVoteForTrack={handleVoteForTrack}
      className={className}
    />
  );
}