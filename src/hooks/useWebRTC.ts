import { useState, useCallback, useRef, useEffect } from 'react';
import { useCurrentUser } from './useCurrentUser';
import { useToast } from './useToast';

export interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  isMuted: boolean;
  isVideoEnabled: boolean;
}

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

const DEFAULT_CONFIG: WebRTCConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC(config: WebRTCConfig = DEFAULT_CONFIG) {
  const { user: _user } = useCurrentUser();
  const { toast } = useToast();
  
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [_isConnecting, _setIsConnecting] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());

  // Update refs when state changes
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  // Initialize local media stream
  const initializeMedia = useCallback(async (video = false, audio = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audio,
        video: video,
      });
      
      setLocalStream(stream);
      setIsAudioEnabled(audio);
      setIsVideoEnabled(video);
      
      return stream;
    } catch (error) {
      console.error('Failed to get user media:', error);
      toast({
        title: 'Media Access Failed',
        description: 'Could not access microphone or camera. Please check permissions.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  // Create a new peer connection
  const createPeerConnection = useCallback((_peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(config);
    
    // Add local stream tracks if available
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    return pc;
  }, [config]);

  // Create offer for a peer
  const createOffer = useCallback(async (peerId: string): Promise<RTCSessionDescriptionInit | null> => {
    try {
      const pc = createPeerConnection(peerId);
      
      // Set up event handlers
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // This will be handled by the parent component
          // to send ICE candidates via Nostr
        }
      };

      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        setPeers(prev => {
          const newPeers = new Map(prev);
          const peer = newPeers.get(peerId);
          if (peer) {
            peer.remoteStream = remoteStream;
            newPeers.set(peerId, peer);
          }
          return newPeers;
        });
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Store peer connection
      setPeers(prev => {
        const newPeers = new Map(prev);
        newPeers.set(peerId, {
          id: peerId,
          connection: pc,
          isMuted: false,
          isVideoEnabled: false,
        });
        return newPeers;
      });

      return offer;
    } catch (error) {
      console.error('Failed to create offer:', error);
      toast({
        title: 'Connection Failed',
        description: 'Could not create connection offer.',
        variant: 'destructive',
      });
      return null;
    }
  }, [createPeerConnection, toast]);

  // Handle incoming offer
  const handleOffer = useCallback(async (
    peerId: string, 
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit | null> => {
    try {
      const pc = createPeerConnection(peerId);

      // Set up event handlers
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // This will be handled by the parent component
          // to send ICE candidates via Nostr
        }
      };

      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        setPeers(prev => {
          const newPeers = new Map(prev);
          const peer = newPeers.get(peerId);
          if (peer) {
            peer.remoteStream = remoteStream;
            newPeers.set(peerId, peer);
          }
          return newPeers;
        });
      };

      // Set remote description
      await pc.setRemoteDescription(offer);

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Store peer connection
      setPeers(prev => {
        const newPeers = new Map(prev);
        newPeers.set(peerId, {
          id: peerId,
          connection: pc,
          isMuted: false,
          isVideoEnabled: false,
        });
        return newPeers;
      });

      return answer;
    } catch (error) {
      console.error('Failed to handle offer:', error);
      toast({
        title: 'Connection Failed',
        description: 'Could not handle connection offer.',
        variant: 'destructive',
      });
      return null;
    }
  }, [createPeerConnection, toast]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (peerId: string, answer: RTCSessionDescriptionInit) => {
    try {
      const peer = peersRef.current.get(peerId);
      if (peer) {
        await peer.connection.setRemoteDescription(answer);
      }
    } catch (error) {
      console.error('Failed to handle answer:', error);
      toast({
        title: 'Connection Failed',
        description: 'Could not handle connection answer.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(async (peerId: string, candidate: RTCIceCandidateInit) => {
    try {
      const peer = peersRef.current.get(peerId);
      if (peer && peer.connection.remoteDescription) {
        await peer.connection.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error('Failed to handle ICE candidate:', error);
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  // Disconnect from a specific peer
  const disconnectPeer = useCallback((peerId: string) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      peer.connection.close();
      setPeers(prev => {
        const newPeers = new Map(prev);
        newPeers.delete(peerId);
        return newPeers;
      });
    }
  }, []);

  // Disconnect from all peers
  const disconnectAll = useCallback(() => {
    peersRef.current.forEach((peer) => {
      peer.connection.close();
    });
    setPeers(new Map());
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    // Close all peer connections
    peersRef.current.forEach((peer) => {
      peer.connection.close();
    });
    
    // Stop local media stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setPeers(new Map());
    setLocalStream(null);
    setIsAudioEnabled(true);
    setIsVideoEnabled(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // State
    peers,
    localStream,
    isConnecting: _isConnecting,
    isAudioEnabled,
    isVideoEnabled,

    // Methods
    initializeMedia,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    toggleAudio,
    toggleVideo,
    disconnectPeer,
    disconnectAll,
    cleanup,
  };
}