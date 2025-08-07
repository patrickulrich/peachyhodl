import { useEffect, useRef } from "react";
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

  useEffect(() => {
    if (videoRef.current && streamUrl) {
      // For HLS streams (m3u8), you would typically use a library like hls.js
      // For now, we'll use native video element for compatible streams
      videoRef.current.src = streamUrl;
    }
  }, [streamUrl]);

  return (
    <Card className="overflow-hidden bg-black">
      <CardContent className="p-0 relative">
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

        <div className="aspect-video bg-black">
          {streamUrl.endsWith(".m3u8") ? (
            <video
              ref={videoRef}
              controls
              autoPlay
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