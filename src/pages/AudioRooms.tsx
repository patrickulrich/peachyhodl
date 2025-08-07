import { useSeoMeta } from '@unhead/react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AudioRoom } from '@/components/audio/AudioRoom';
import { Mic } from 'lucide-react';
import { PEACHY_AUDIO_ROOM } from '@/hooks/useNIP100';

const AudioRooms = () => {
  useSeoMeta({
    title: 'Peachy\'s Audio Room - Connect and Communicate',
    description: 'Join Peachy\'s audio room for Bitcoin and Lightning discussions.',
  });

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <Mic className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold">{PEACHY_AUDIO_ROOM.name}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join Peachy's community audio room for real-time Bitcoin and Lightning discussions 
            powered by Nostr and WebRTC technology.
          </p>
        </div>

        {/* Audio Room Component */}
        <AudioRoom />
      </div>
    </MainLayout>
  );
};

export default AudioRooms;