import { useContext } from 'react';
import { MusicPlayerContext, type MusicPlayerContextType } from '@/contexts/MusicPlayerTypes';

export function useMusicPlayer(): MusicPlayerContextType {
  const context = useContext(MusicPlayerContext);
  if (context === undefined) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
}