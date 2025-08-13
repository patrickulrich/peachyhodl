import { createContext } from 'react';
import type { MusicTrack } from '@/hooks/useMusicLists';

export interface MusicPlayerState {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  playlist: MusicTrack[];
  currentIndex: number;
  isPlayerVisible: boolean;
  hasUserInteracted: boolean;
}

export interface MusicPlayerActions {
  playTrack: (track: MusicTrack, playlist?: MusicTrack[], index?: number) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setIsLoading: (loading: boolean) => void;
  closePlayer: () => void;
  showPlayer: () => void;
  hidePlayer: () => void;
  updatePlaylist: (playlist: MusicTrack[], index?: number) => void;
  setHasUserInteracted: (hasInteracted: boolean) => void;
}

export type MusicPlayerContextType = MusicPlayerState & MusicPlayerActions;

export const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);