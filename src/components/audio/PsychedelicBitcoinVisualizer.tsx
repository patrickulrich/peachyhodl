import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface PsychedelicBitcoinVisualizerProps {
  audioElement?: HTMLAudioElement | null;
  className?: string;
  isPlaying?: boolean;
}

export function PsychedelicBitcoinVisualizer({ 
  audioElement, 
  className,
  isPlaying = false 
}: PsychedelicBitcoinVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasAudioData, setHasAudioData] = useState(false);
  const [corsBlocked, setCorsBlocked] = useState(false);
  const audioDataCheckRef = useRef<number>(0);


  // Initialize audio context and analyser
  useEffect(() => {
    if (!audioElement || isInitialized) return;

    // Wait for audio element to be ready
    const initAudio = async () => {
      try {
        console.log('Initializing visualizer with audio element:', audioElement);
        
        // Wait for audio element to be ready
        if (audioElement.readyState === 0) {
          console.log('Audio element not ready, waiting for loadedmetadata...');
          await new Promise<void>((resolve) => {
            const onLoadedMetadata = () => {
              audioElement.removeEventListener('loadedmetadata', onLoadedMetadata);
              resolve();
            };
            audioElement.addEventListener('loadedmetadata', onLoadedMetadata);
          });
        }

        console.log('Audio element ready, creating audio context...');
        
        // Create audio context
        const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error('AudioContext not supported');
        }
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;

        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        console.log('Creating analyser and source...');

        // Create analyser
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        // Check if element already has a source (to avoid creating multiple)
        if (!sourceRef.current) {
          try {
            // Create source and connect
            const source = audioContext.createMediaElementSource(audioElement);
            sourceRef.current = source;
            
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            
            console.log('Audio source connected successfully');
          } catch (error) {
            console.warn('Failed to connect audio source (CORS restriction):', error);
            console.log('Audio playback will work but visualization will use fallback animation');
            setCorsBlocked(true);
            setHasAudioData(false);
            // Continue with initialization but without audio source connection
            // The audio will still play through the normal audio element
          }
        }

        // Create data array
        const bufferLength = analyser.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);

        console.log('Visualizer initialized successfully');
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize audio context:', error);
        // Still mark as initialized to prevent infinite retry
        setIsInitialized(true);
      }
    };

    initAudio();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [audioElement, isInitialized]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    let time = 0;

    const animate = () => {
      if (!isPlaying) return;

      time += 0.016; // ~60fps
      
      // Get frequency data if available, otherwise use default animation
      let bassLevel = 0.3;
      let midLevel = 0.3;
      let trebleLevel = 0.3;
      let overallLevel = 0.3;

      if (analyser && dataArray) {
        try {
          analyser.getByteFrequencyData(dataArray);
          
          // Check if we're getting actual audio data (not just zeros due to CORS)
          const totalSum = dataArray.reduce((a, b) => a + b, 0);
          
          if (totalSum > 0) {
            if (!hasAudioData) {
              console.log('Audio analysis working - receiving frequency data');
              setHasAudioData(true);
            }
            
            // Calculate audio metrics
            const bassSum = dataArray.slice(0, 32).reduce((a, b) => a + b, 0);
            const midSum = dataArray.slice(32, 96).reduce((a, b) => a + b, 0);
            const trebleSum = dataArray.slice(96, 128).reduce((a, b) => a + b, 0);
            
            bassLevel = bassSum / (32 * 255);
            midLevel = midSum / (64 * 255);
            trebleLevel = trebleSum / (32 * 255);
            overallLevel = (bassLevel + midLevel + trebleLevel) / 3;
          } else {
            // No audio data - likely CORS issue
            audioDataCheckRef.current++;
            if (audioDataCheckRef.current > 60 && hasAudioData) { // After ~1 second of no data
              console.log('No audio data detected - likely CORS restriction');
              setHasAudioData(false);
            }
            
            // Use enhanced fallback animation
            bassLevel = 0.4 + Math.sin(time * 2.5) * 0.3;
            midLevel = 0.4 + Math.sin(time * 3.2) * 0.3;
            trebleLevel = 0.4 + Math.sin(time * 4.1) * 0.3;
            overallLevel = (bassLevel + midLevel + trebleLevel) / 3;
          }
        } catch {
          // Use default animation values if audio analysis fails
          bassLevel = 0.4 + Math.sin(time * 2) * 0.2;
          midLevel = 0.4 + Math.sin(time * 3) * 0.2;
          trebleLevel = 0.4 + Math.sin(time * 4) * 0.2;
          overallLevel = (bassLevel + midLevel + trebleLevel) / 3;
        }
      } else {
        // Fallback animation without audio data
        bassLevel = 0.3 + Math.sin(time * 2) * 0.2;
        midLevel = 0.3 + Math.sin(time * 3) * 0.2;
        trebleLevel = 0.3 + Math.sin(time * 4) * 0.2;
        overallLevel = (bassLevel + midLevel + trebleLevel) / 3;
      }

      // Clear canvas
      ctx.fillStyle = `rgba(0, 0, 0, 0.1)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create psychedelic background
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
      );
      
      const hue1 = (time * 30 + bassLevel * 180) % 360;
      const hue2 = (time * 45 + midLevel * 180 + 120) % 360;
      const hue3 = (time * 60 + trebleLevel * 180 + 240) % 360;
      
      gradient.addColorStop(0, `hsla(${hue1}, 80%, 50%, ${0.1 + overallLevel * 0.3})`);
      gradient.addColorStop(0.5, `hsla(${hue2}, 70%, 40%, ${0.05 + overallLevel * 0.2})`);
      gradient.addColorStop(1, `hsla(${hue3}, 60%, 30%, ${0.02 + overallLevel * 0.1})`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw frequency bars in circular pattern
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(canvas.width, canvas.height) * 0.15;
      
      const barCount = dataArray ? Math.floor(dataArray.length / 2) : 64;
      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2;
        const value = dataArray ? dataArray[i * 2] / 255 : (0.3 + Math.sin(time * 5 + i * 0.1) * 0.2);
        const length = radius + value * radius * 2;
        
        const x1 = centerX + Math.cos(angle + time * 2) * radius;
        const y1 = centerY + Math.sin(angle + time * 2) * radius;
        const x2 = centerX + Math.cos(angle + time * 2) * length;
        const y2 = centerY + Math.sin(angle + time * 2) * length;
        
        const hue = (angle * 180 / Math.PI + time * 50) % 360;
        ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${0.6 + value * 0.4})`;
        ctx.lineWidth = 2 + value * 4;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Draw multiple Bitcoin logos with different effects
      const numLogos = 8;
      for (let i = 0; i < numLogos; i++) {
        const logoTime = time + (i * Math.PI * 2) / numLogos;
        const logoRadius = 80 + Math.sin(logoTime * 3 + bassLevel * 10) * 40;
        const logoX = centerX + Math.cos(logoTime + midLevel * 5) * logoRadius;
        const logoY = centerY + Math.sin(logoTime + trebleLevel * 5) * logoRadius;
        
        const scale = 0.8 + overallLevel * 1.5 + Math.sin(logoTime * 5) * 0.3;
        const rotation = logoTime * 2 + bassLevel * 10;
        const opacity = 0.3 + overallLevel * 0.7 + Math.sin(logoTime * 4) * 0.3;
        
        ctx.save();
        ctx.translate(logoX, logoY);
        ctx.rotate(rotation);
        ctx.scale(scale, scale);
        
        // Bitcoin symbol with glow effect
        const logoHue = (logoTime * 60 + i * 45) % 360;
        
        // Glow
        ctx.shadowColor = `hsla(${logoHue}, 80%, 50%, ${opacity})`;
        ctx.shadowBlur = 20 + bassLevel * 30;
        ctx.fillStyle = `hsla(${logoHue}, 90%, 60%, ${opacity})`;
        
        // Draw Bitcoin B
        ctx.font = `${24 + bassLevel * 20}px bold sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('₿', 0, 0);
        
        ctx.restore();
      }

      // Central pulsing Bitcoin logo
      const centralScale = 1.5 + overallLevel * 2 + Math.sin(time * 8) * 0.5;
      const centralRotation = time * 1.5 + overallLevel * 5;
      const centralHue = (time * 100) % 360;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(centralRotation);
      ctx.scale(centralScale, centralScale);
      
      // Multi-layer glow effect
      for (let layer = 0; layer < 3; layer++) {
        const layerOpacity = (0.8 - layer * 0.2) * (0.5 + overallLevel);
        const layerSize = 40 + layer * 10 + bassLevel * 20;
        
        ctx.shadowColor = `hsla(${centralHue + layer * 30}, 80%, 50%, ${layerOpacity})`;
        ctx.shadowBlur = 30 + layer * 20 + overallLevel * 40;
        ctx.fillStyle = `hsla(${centralHue + layer * 30}, 90%, 60%, ${layerOpacity})`;
        
        ctx.font = `${layerSize}px bold sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('₿', 0, 0);
      }
      
      ctx.restore();

      // Draw particle effects
      const numParticles = 50;
      for (let i = 0; i < numParticles; i++) {
        const particleTime = time * 2 + i * 0.1;
        const particleRadius = 200 + Math.sin(particleTime) * 100;
        const angle = (i / numParticles) * Math.PI * 2 + time * 0.5;
        
        const x = centerX + Math.cos(angle) * particleRadius;
        const y = centerY + Math.sin(angle) * particleRadius;
        
        const size = 2 + overallLevel * 6 + Math.sin(particleTime * 3) * 2;
        const hue = (angle * 180 / Math.PI + time * 100) % 360;
        const opacity = 0.3 + overallLevel * 0.7 + Math.sin(particleTime * 5) * 0.3;
        
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, hasAudioData, corsBlocked]);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
      {!audioElement && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center space-y-4">
            <div className="text-6xl">₿</div>
            <p className="text-white/70 text-lg">Start playing music to see the visualizer</p>
          </div>
        </div>
      )}
      {audioElement && !isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-white/70 text-lg">Initializing visualizer...</p>
          </div>
        </div>
      )}
      {isInitialized && isPlaying && (corsBlocked || !hasAudioData) && (
        <div className="absolute top-4 right-4 bg-black/80 rounded-lg px-3 py-2 border border-orange-500/30">
          <div className="flex items-center gap-2 text-orange-400">
            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <p className="text-sm">{corsBlocked ? 'CORS restricted audio' : 'Audio-reactive mode unavailable'}</p>
          </div>
          <p className="text-xs text-orange-400/70 mt-1">Showing rhythmic animation</p>
        </div>
      )}
    </div>
  );
}