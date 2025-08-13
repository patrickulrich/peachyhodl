import { useState, useCallback, ReactNode } from 'react';
import {
  MusicPlayerContext,
  type MusicPlayerState,
  type MusicPlayerContextType
} from './MusicPlayerTypes';
import type { MusicTrack } from '@/hooks/useMusicLists';

const initialState: MusicPlayerState = {
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
  isLoading: false,
  playlist: [],
  currentIndex: 0,
  isPlayerVisible: false,
  hasUserInteracted: false,
};

interface MusicPlayerProviderProps {
  children: ReactNode;
}

export function MusicPlayerProvider({ children }: MusicPlayerProviderProps) {
  const [state, setState] = useState<MusicPlayerState>(initialState);

  const playTrack = useCallback((track: MusicTrack, playlist: MusicTrack[] = [], index: number = 0) => {
    // Validate that the track has a playable media URL
    const mediaUrl = track.mediaUrl || track.urls?.[0]?.url;
    if (!mediaUrl) {
      console.error('Cannot play track without valid media URL:', track);
      return;
    }

    
    setState(prev => ({
      ...prev,
      currentTrack: track,
      isPlaying: true,
      playlist: playlist.length > 0 ? playlist : [track],
      currentIndex: playlist.length > 0 ? index : 0,
      isPlayerVisible: true,
      hasUserInteracted: true, // Mark user interaction when playing a track
    }));
  }, []);

  const togglePlay = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPlaying: !prev.isPlaying,
    }));
  }, []);

  const nextTrack = useCallback(() => {
    setState(prev => {
      if (prev.playlist.length === 0) return prev;
      
      const nextIndex = (prev.currentIndex + 1) % prev.playlist.length;
      const nextTrack = prev.playlist[nextIndex];
      
      return {
        ...prev,
        currentTrack: nextTrack,
        currentIndex: nextIndex,
        isPlaying: true,
        currentTime: 0,
      };
    });
  }, []);

  const previousTrack = useCallback(() => {
    setState(prev => {
      if (prev.playlist.length === 0) return prev;
      
      const prevIndex = prev.currentIndex === 0 ? prev.playlist.length - 1 : prev.currentIndex - 1;
      const prevTrack = prev.playlist[prevIndex];
      
      return {
        ...prev,
        currentTrack: prevTrack,
        currentIndex: prevIndex,
        isPlaying: true,
        currentTime: 0,
      };
    });
  }, []);

  const setCurrentTime = useCallback((time: number) => {
    setState(prev => ({
      ...prev,
      currentTime: time,
    }));
  }, []);

  const setDuration = useCallback((duration: number) => {
    setState(prev => ({
      ...prev,
      duration,
    }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setState(prev => ({
      ...prev,
      volume,
    }));
  }, []);

  const toggleMute = useCallback(() => {
    setState(prev => ({
      ...prev,
      isMuted: !prev.isMuted,
    }));
  }, []);

  const setIsLoading = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading: loading,
    }));
  }, []);

  const closePlayer = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentTrack: null,
      isPlaying: false,
      playlist: [],
      currentIndex: 0,
      isPlayerVisible: false,
      currentTime: 0,
      duration: 0,
    }));
  }, []);

  const showPlayer = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPlayerVisible: true,
    }));
  }, []);

  const hidePlayer = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPlayerVisible: false,
    }));
  }, []);

  const updatePlaylist = useCallback((playlist: MusicTrack[], index: number = 0) => {
    setState(prev => ({
      ...prev,
      playlist,
      currentIndex: Math.min(index, playlist.length - 1),
    }));
  }, []);

  const setHasUserInteracted = useCallback((hasInteracted: boolean) => {
    setState(prev => ({
      ...prev,
      hasUserInteracted: hasInteracted,
    }));
  }, []);

  const contextValue: MusicPlayerContextType = {
    ...state,
    playTrack,
    togglePlay,
    nextTrack,
    previousTrack,
    setCurrentTime,
    setDuration,
    setVolume,
    toggleMute,
    setIsLoading,
    closePlayer,
    showPlayer,
    hidePlayer,
    updatePlaylist,
    setHasUserInteracted,
  };

  return (
    <MusicPlayerContext.Provider value={contextValue}>
      {children}
    </MusicPlayerContext.Provider>
  );
}