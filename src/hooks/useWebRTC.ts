import { useCallback, useRef, useEffect, useState } from 'react';
import { useCurrentUser } from './useCurrentUser';
import { useToast } from './useToast';

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

const DEFAULT_CONFIG: WebRTCConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// NRTC Pattern: Direct object management (no React state for peers)
const peers: Record<string, RTCPeerConnection> = {};
let remoteAudioElement: HTMLAudioElement | null = null;
let remoteStream: MediaStream | null = null;

// Expose peers globally for debugging and duplicate checking
declare global {
  interface Window {
    peers: Record<string, RTCPeerConnection>;
  }
}

if (typeof window !== 'undefined') {
  window.peers = peers;
}

export function useWebRTC(config: WebRTCConfig = DEFAULT_CONFIG) {
  const { user: _user } = useCurrentUser();
  const { toast } = useToast();
  
  // Only use React state for UI-related state that needs re-renders
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [users, setUsers] = useState<string[]>([]);
  
  const localStreamRef = useRef<MediaStream | null>(null);

  // Initialize global audio element and stream (NRTC pattern)
  useEffect(() => {
    if (!remoteStream) {
      remoteStream = new MediaStream();
      remoteAudioElement = document.querySelector("#remoteAudio");
      if (remoteAudioElement) {
        remoteAudioElement.srcObject = remoteStream;
      }
    }
  }, []);

  // Update refs when state changes
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

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

  // NRTC Pattern: Helper functions for peer management
  const addLocalStream = useCallback((pc: RTCPeerConnection) => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }
  }, []);

  const addRemoteStream = useCallback((pc: RTCPeerConnection) => {
    pc.ontrack = (evt) => {
      if (remoteStream && evt.track) {
        remoteStream.addTrack(evt.track);
      }
    };
  }, []);

  // NRTC Pattern: Remove peer connection
  const removeRTCPeerConnection = useCallback((id: string) => {
    const pc = peers[id];
    if (!pc) return;

    // Remove tracks from remote stream before closing
    if (remoteStream) {
      const senders = pc.getSenders();
      senders.forEach(sender => {
        if (sender.track && remoteStream) {
          remoteStream.removeTrack(sender.track);
        }
      });
    }

    pc.close();
    delete peers[id];
    
    // Update users list for UI
    setUsers(Object.keys(peers));
    
    console.log(`removed rtc peer connection ${id}`);
  }, []);

  // NRTC Pattern: Initialize peer connection and create offer
  const initRTCPeerConnection = useCallback(async (id: string, onIceCandidate?: (candidate: RTCIceCandidate) => void): Promise<RTCSessionDescriptionInit | null> => {
    try {
      // NRTC Pattern: Always create new connections and overwrite existing ones
      // This handles the race condition where both users see each other's "connect" events
      if (peers[id]) {
        const existingState = peers[id].signalingState;
        console.log(`Overwriting existing connection for ${id} (was in ${existingState} state)`);
        peers[id].close();
        delete peers[id];
      }
      
      // NRTC Pattern: Create new connection
      const pc = new RTCPeerConnection(config);

      addLocalStream(pc);
      addRemoteStream(pc);

      // Set up ICE candidate handler
      pc.onicecandidate = (event) => {
        if (event.candidate && onIceCandidate) {
          onIceCandidate(event.candidate);
        }
      };

      // NRTC Pattern: NO ICE handler in initRTCPeerConnection
      // ICE handlers are ONLY set in onRTCAnswer and onRTCoffer
      // This is intentional in NRTC - connection initiator doesn't handle disconnects

      // Add peer connection to peers list (NRTC pattern)
      peers[id] = pc;

      // Update users list for UI
      setUsers(Object.keys(peers));

      // Create a new offer
      const offer = await pc.createOffer();

      // Set offer as local description
      await pc.setLocalDescription(offer);

      console.log(`init new rtc peer connection for client ${id}`, offer);
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
  }, [config, addLocalStream, addRemoteStream, toast]);

  // NRTC Pattern: Handle incoming offer
  const onRTCOffer = useCallback(async (
    id: string, 
    offer: RTCSessionDescriptionInit,
    onIceCandidate?: (candidate: RTCIceCandidate) => void
  ): Promise<RTCSessionDescriptionInit | null> => {
    try {
      console.log(`got offer from ${id}`, offer);

      if (!offer) return null;

      // NRTC Pattern: Always accept offers and overwrite existing connections
      // This prevents race conditions when both users try to initiate simultaneously
      if (peers[id]) {
        const existingState = peers[id].signalingState;
        console.log(`Replacing existing connection for ${id} with new offer (was in ${existingState} state)`);
        peers[id].close();
        delete peers[id];
      }

      const pc = new RTCPeerConnection(config);

      addLocalStream(pc);
      addRemoteStream(pc);

      // Set up ICE candidate handler
      pc.onicecandidate = (event) => {
        if (event.candidate && onIceCandidate) {
          onIceCandidate(event.candidate);
        }
      };

      // Set up disconnect handler
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "disconnected") {
          removeRTCPeerConnection(id);
        }
      };

      // Add to peers list (NRTC pattern)
      peers[id] = pc;

      // Update users list for UI
      setUsers(Object.keys(peers));

      const desc = new RTCSessionDescription(offer);
      await pc.setRemoteDescription(desc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

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
  }, [config, addLocalStream, addRemoteStream, removeRTCPeerConnection, toast]);

  // NRTC Pattern: Handle incoming answer
  const onRTCAnswer = useCallback(async (id: string, answer: RTCSessionDescriptionInit) => {
    try {
      console.log(`got answer from ${id}`, answer);

      const pc = peers[id];
      if (!pc) return;

      // Set up disconnect handler
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "disconnected") {
          removeRTCPeerConnection(id);
        }
      };

      if (!answer) return;

      // NRTC Pattern: Check connection state before setting answer
      // Only set remote description if we're in the correct state
      if (pc.signalingState !== 'have-local-offer') {
        console.log(`Ignoring answer from ${id} - wrong signaling state: ${pc.signalingState}`);
        return;
      }

      const desc = new RTCSessionDescription(answer);
      await pc.setRemoteDescription(desc);
    } catch (error) {
      console.error('Failed to handle answer:', error);
      toast({
        title: 'Connection Failed',
        description: 'Could not handle connection answer.',
        variant: 'destructive',
      });
    }
  }, [removeRTCPeerConnection, toast]);

  // NRTC Pattern: Handle incoming ICE candidate
  const onRTCIceCandidate = useCallback(async (id: string, candidate: RTCIceCandidateInit) => {
    try {
      console.log(`got ice candidate from ${id}`, candidate);

      if (!candidate) return;

      const pc = peers[id];
      if (!pc) return;

      await pc.addIceCandidate(candidate);
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

  // NRTC Pattern: Disconnect all peers
  const disconnectAll = useCallback(() => {
    Object.keys(peers).forEach((id) => {
      removeRTCPeerConnection(id);
    });
  }, [removeRTCPeerConnection]);

  // Cleanup
  const cleanup = useCallback(() => {
    // Close all peer connections
    Object.keys(peers).forEach((id) => {
      const pc = peers[id];
      if (pc) {
        pc.close();
        delete peers[id];
      }
    });
    
    // Stop local media stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Clear remote stream
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => {
        remoteStream!.removeTrack(track);
        track.stop();
      });
    }
    
    setUsers([]);
    setLocalStream(null);
    setIsAudioEnabled(true);
    setIsVideoEnabled(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // State (NRTC pattern)
    users, // List of peer IDs for UI
    localStream,
    isAudioEnabled,
    isVideoEnabled,

    // NRTC Methods
    initializeMedia,
    initRTCPeerConnection,
    onRTCOffer,
    onRTCAnswer,
    onRTCIceCandidate,
    removeRTCPeerConnection,
    toggleAudio,
    toggleVideo,
    disconnectAll,
    cleanup,

    // Direct access to peers object for compatibility
    getPeer: (id: string) => peers[id],
    getAllPeers: () => ({ ...peers }),
  };
}