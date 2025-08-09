import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Wifi } from "lucide-react";

interface LiveStreamPlayerProps {
  streamUrl: string;
  title?: string | null;
  image?: string | null;
  participantCount?: number;
}

export function LiveStreamPlayer({
  streamUrl,
  title,
  image,
  participantCount = 0,
}: LiveStreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    if (!videoRef.current || !streamUrl) return;

    const video = videoRef.current;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (streamUrl.endsWith(".m3u8")) {
      // Use HLS.js for .m3u8 streams
      if (Hls.isSupported()) {
        const hls = new Hls({
          debug: false,
          enableWorker: false,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 300,
          startLevel: -1,
          autoStartLoad: true,
        });
        
        hlsRef.current = hls;
        
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log("HLS media attached");
          hls.loadSource(streamUrl);
        });
        
        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          console.log("HLS manifest parsed, levels:", data.levels.length);
          // Don't autoplay, let user click play button
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error("HLS error:", data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log("Network error, trying to recover...");
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log("Media error, trying to recover...");
                hls.recoverMediaError();
                break;
              default:
                console.log("Fatal error, cannot recover");
                hls.destroy();
                break;
            }
          }
        });

        // Attach media first, then load source
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Fallback for Safari which has native HLS support
        console.log("Using native HLS support");
        video.src = streamUrl;
      } else {
        console.error("HLS is not supported in this browser");
      }
    } else {
      // For non-HLS streams, use direct source
      video.src = streamUrl;
    }

    // Cleanup function
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl]);

  return (
    <Card className="overflow-hidden bg-black h-full">
      <CardContent className="p-0 relative h-full">
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <Badge variant="destructive" className="flex items-center gap-1">
            <Wifi className="h-3 w-3" />
            LIVE
          </Badge>
          {participantCount > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {participantCount}
            </Badge>
          )}
        </div>
        
        {title && (
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <h3 className="text-white text-lg font-semibold bg-black/70 backdrop-blur-sm px-3 py-2 rounded">
              {title}
            </h3>
          </div>
        )}

        <div className="h-full bg-black">
          {streamUrl.endsWith(".m3u8") ? (
            <video
              ref={videoRef}
              controls
              muted
              playsInline
              className="w-full h-full object-contain"
              poster={image || undefined}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <iframe
              src={streamUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={title || "Live Stream"}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}