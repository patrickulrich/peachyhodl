import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useNIP100, PEACHY_AUDIO_ROOM } from '@/hooks/useNIP100';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useToast } from '@/hooks/useToast';
import { genUserName } from '@/lib/genUserName';
import type { WebRTCSignalingEvent } from '@/hooks/useNIP100';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Phone, 
  PhoneOff, 
  Users,
  Volume2,
  VolumeX,
  Shield,
  UserX,
  Ban
} from 'lucide-react';

export function AudioRoom() {
  const roomId = PEACHY_AUDIO_ROOM.id;
  const roomName = PEACHY_AUDIO_ROOM.name;
  const { user } = useCurrentUser();
  const { toast } = useToast();
  
  const [isJoined, setIsJoined] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [_audioLevels, _setAudioLevels] = useState<Map<string, number>>(new Map());
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const {
    users,
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    initializeMedia,
    initRTCPeerConnection,
    onRTCOffer,
    onRTCAnswer,
    onRTCIceCandidate,
    toggleAudio,
    toggleVideo,
    disconnectAll,
    cleanup,
  } = useWebRTC();

  const {
    publishConnect,
    publishDisconnect,
    publishOffer,
    publishAnswer,
    publishIceCandidate,
    registerEventHandler,
    unregisterEventHandler,
    startListening,
    isModerator,
    isUserBanned,
    kickUser,
    banUser,
    availableRooms,
  } = useNIP100();

  // Join room
  const joinRoom = useCallback(async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to join audio rooms.',
        variant: 'destructive',
      });
      return;
    }

    // Check if user is banned
    if (isUserBanned(user.pubkey)) {
      toast({
        title: 'Access Denied',
        description: 'You have been banned from this audio room.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Initialize media first
      await initializeMedia(false, true); // Audio only by default
      
      // Start listening for signaling events first
      await startListening();
      
      // Set joined state BEFORE announcing presence
      // This is important so we don't initiate connections when we receive our own connect event
      setIsJoined(true);
      
      // Wait a moment for existing participants to be discovered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get current participants from available rooms
      const currentRoom = availableRooms.get(roomId);
      const existingParticipants = currentRoom?.participants || [];
      
      // Announce our presence to the room
      // NRTC pattern: New joiner broadcasts connect, existing users will initiate connections TO us
      await publishConnect(roomId, []); // Empty array means broadcast to all
      
      toast({
        title: 'Joined Room',
        description: `Connected to ${roomName} (${existingParticipants.length} participant${existingParticipants.length === 1 ? '' : 's'} already connected)`,
      });
    } catch (error) {
      console.error('Failed to join room:', error);
      setIsJoined(false); // Reset state on error
      toast({
        title: 'Failed to Join',
        description: 'Could not join the audio room. Please try again.',
        variant: 'destructive',
      });
    }
  }, [user, roomId, roomName, isUserBanned, initializeMedia, startListening, publishConnect, availableRooms, toast]);

  // Leave room
  const leaveRoom = useCallback(async () => {
    try {
      // Publish disconnect event
      if (isJoined) {
        const currentRoom = availableRooms.get(roomId);
        const participants = currentRoom?.participants || [];
        await publishDisconnect(roomId, participants);
      }
      
      // Clean up connections
      disconnectAll();
      cleanup();
      
      setIsJoined(false);
      
      toast({
        title: 'Left Room',
        description: `Disconnected from ${roomName}`,
      });
    } catch (error) {
      console.error('Failed to leave room:', error);
    }
  }, [isJoined, roomId, roomName, publishDisconnect, disconnectAll, cleanup, availableRooms, toast]);

  // Set up WebRTC signaling event handlers
  useEffect(() => {
    if (!user) return;

    const handleConnect = async (event: WebRTCSignalingEvent) => {
      // NRTC pattern: Only existing users (already joined) initiate connections to new users
      // This prevents the "mutual kick" issue where both users try to initiate
      if (event.roomId === roomId && event.pubkey !== user.pubkey && isJoined) {
        // Check if we already have a connection with this peer
        // This prevents duplicate connections
        const existingPeer = users.find(id => id === event.pubkey);
        if (existingPeer) {
          console.log(`Already connected to ${event.pubkey.substring(0, 8)}...`);
          return;
        }
        
        // Someone else joined the room - we (existing user) should initiate connection TO them
        try {
          console.log(`New participant joined: ${event.pubkey.substring(0, 8)}... - initiating connection`);
          
          // NRTC pattern: Existing users always initiate to new users
          // This prevents race conditions when multiple people join simultaneously
          const offer = await initRTCPeerConnection(event.pubkey, (candidate: RTCIceCandidate) => {
            publishIceCandidate(candidate, event.pubkey, roomId);
          });
          if (offer) {
            await publishOffer(offer, event.pubkey, roomId);
            console.log(`Sent offer to ${event.pubkey.substring(0, 8)}...`);
          }
        } catch (error) {
          console.error('Failed to create offer for new participant:', error);
        }
      }
    };

    const handleOfferEvent = async (event: WebRTCSignalingEvent) => {
      if (event.roomId === roomId && event.pubkey !== user.pubkey && event.content) {
        // Check if we already have a connection with this peer
        const existingPeer = users.find(id => id === event.pubkey);
        if (existingPeer) {
          console.log(`Already have connection with ${event.pubkey.substring(0, 8)}..., ignoring offer`);
          return;
        }
        
        try {
          const content = event.content as { sdp: string };
          const answer = await onRTCOffer(event.pubkey, {
            type: 'offer',
            sdp: content.sdp
          }, (candidate: RTCIceCandidate) => {
            publishIceCandidate(candidate, event.pubkey, roomId);
          });
          if (answer) {
            await publishAnswer(answer, event.pubkey, roomId);
          }
        } catch (error) {
          console.error('Failed to handle offer:', error);
        }
      }
    };

    const handleAnswerEvent = async (event: WebRTCSignalingEvent) => {
      if (event.roomId === roomId && event.pubkey !== user.pubkey && event.content) {
        try {
          const content = event.content as { sdp: string };
          await onRTCAnswer(event.pubkey, {
            type: 'answer',
            sdp: content.sdp
          });
        } catch (error) {
          console.error('Failed to handle answer:', error);
        }
      }
    };

    const handleCandidate = async (event: WebRTCSignalingEvent) => {
      if (event.roomId === roomId && event.pubkey !== user.pubkey && event.content) {
        try {
          const content = event.content as { 
            candidate: string; 
            sdpMid: string; 
            sdpMLineIndex: number;
          };
          await onRTCIceCandidate(event.pubkey, {
            candidate: content.candidate,
            sdpMid: content.sdpMid,
            sdpMLineIndex: content.sdpMLineIndex,
          });
        } catch (error) {
          console.error('Failed to handle ICE candidate:', error);
        }
      }
    };

    // Register event handlers
    registerEventHandler('connect', handleConnect);
    registerEventHandler('offer', handleOfferEvent);
    registerEventHandler('answer', handleAnswerEvent);
    registerEventHandler('candidate', handleCandidate);

    return () => {
      unregisterEventHandler('connect');
      unregisterEventHandler('offer');
      unregisterEventHandler('answer');
      unregisterEventHandler('candidate');
    };
  }, [
    user,
    roomId,
    isJoined,
    users,
    initRTCPeerConnection,
    onRTCOffer,
    onRTCAnswer,
    onRTCIceCandidate,
    publishOffer,
    publishAnswer,
    publishIceCandidate,
    registerEventHandler,
    unregisterEventHandler,
  ]);

  // ICE candidate handling is now done directly in the NRTC methods

  // Audio level monitoring
  useEffect(() => {
    if (!localStream || !isJoined) return;

    const setupAudioAnalysis = async () => {
      try {
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        const source = audioContextRef.current.createMediaStreamSource(localStream);
        source.connect(analyserRef.current);
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        
        const updateAudioLevel = () => {
          if (!analyserRef.current) return;
          
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const speaking = average > 30; // Threshold for speaking detection
          
          setIsSpeaking(speaking);
          
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        };
        
        updateAudioLevel();
      } catch (error) {
        console.error('Failed to set up audio analysis:', error);
      }
    };

    setupAudioAnalysis();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [localStream, isJoined]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isJoined) {
        leaveRoom();
      }
    };
  }, [isJoined, leaveRoom]);

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-muted-foreground">
              Please sign in to join audio rooms.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Room Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-xl">{roomName}</CardTitle>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    {isJoined ? users.length + 1 : (availableRooms.get(roomId)?.participants.length || 0)} participant{isJoined ? (users.length === 0 ? '' : 's') : ((availableRooms.get(roomId)?.participants.length || 0) === 1 ? '' : 's')}
                  </p>
                  {isModerator() && (
                    <Badge variant="outline" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      Moderator
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {!isJoined ? (
              <Button onClick={joinRoom} className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Join Room
              </Button>
            ) : (
              <Button onClick={leaveRoom} variant="destructive" className="flex items-center gap-2">
                <PhoneOff className="h-4 w-4" />
                Leave Room
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {isJoined && (
        <>
          {/* Audio Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Audio Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Button
                  variant={isAudioEnabled ? "default" : "destructive"}
                  size="lg"
                  onClick={toggleAudio}
                  className="flex items-center gap-2"
                >
                  {isAudioEnabled ? (
                    <>
                      <Mic className="h-4 w-4" />
                      Mute
                    </>
                  ) : (
                    <>
                      <MicOff className="h-4 w-4" />
                      Unmute
                    </>
                  )}
                </Button>

                <Button
                  variant={isVideoEnabled ? "default" : "outline"}
                  size="lg"
                  onClick={toggleVideo}
                  className="flex items-center gap-2"
                >
                  {isVideoEnabled ? (
                    <>
                      <Video className="h-4 w-4" />
                      Video On
                    </>
                  ) : (
                    <>
                      <VideoOff className="h-4 w-4" />
                      Video Off
                    </>
                  )}
                </Button>

                {/* Speaking indicator */}
                <div className="flex items-center gap-2 text-sm">
                  {isSpeaking ? (
                    <>
                      <Volume2 className="h-4 w-4 text-green-500" />
                      <span className="text-green-500">Speaking</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Quiet</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participants */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Participants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {/* Local user */}
                <ParticipantCard
                  pubkey={user.pubkey}
                  isLocal={true}
                  isSpeaking={isSpeaking}
                  isMuted={!isAudioEnabled}
                  hasVideo={isVideoEnabled}
                />

                {/* Remote participants */}
                {users.map(peerId => (
                  <ParticipantCard
                    key={peerId}
                    pubkey={peerId}
                    isLocal={false}
                    isSpeaking={false} // TODO: Implement remote speaking detection
                    isMuted={false}
                    hasVideo={false}
                    onKick={kickUser}
                    onBan={banUser}
                    canModerate={isModerator()}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// Participant card component
interface ParticipantCardProps {
  pubkey: string;
  isLocal: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  hasVideo: boolean;
  onKick?: (pubkey: string) => void;
  onBan?: (pubkey: string) => void;
  canModerate?: boolean;
}

function ParticipantCard({
  pubkey,
  isLocal,
  isSpeaking,
  isMuted,
  hasVideo,
  onKick,
  onBan,
  canModerate = false,
}: ParticipantCardProps) {
  const author = useAuthor(pubkey);

  const displayName = author.data?.metadata?.name || genUserName(pubkey);
  const avatar = author.data?.metadata?.picture;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${isSpeaking ? 'border-primary bg-primary/5' : ''}`}>
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatar} alt={displayName} />
          <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        
        {/* Status indicators */}
        <div className="absolute -bottom-1 -right-1 flex gap-1">
          {isMuted && (
            <div className="bg-red-500 p-1 rounded-full">
              <MicOff className="h-3 w-3 text-white" />
            </div>
          )}
          {hasVideo && (
            <div className="bg-green-500 p-1 rounded-full">
              <Video className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {displayName}
          {isLocal && <span className="text-muted-foreground ml-1">(You)</span>}
        </p>
        <p className="text-xs text-muted-foreground">
          {isSpeaking ? 'Speaking...' : 'Quiet'}
        </p>
      </div>

      {/* Moderation controls */}
      {canModerate && !isLocal && (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onKick?.(pubkey)}
            className="h-7 w-7 p-0"
            title="Kick user"
          >
            <UserX className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onBan?.(pubkey)}
            className="h-7 w-7 p-0"
            title="Ban user"
          >
            <Ban className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Audio is now handled by global stream */}
    </div>
  );
}