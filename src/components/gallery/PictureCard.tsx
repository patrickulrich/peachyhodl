import { useState } from "react";
import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MapPin, Hash } from "lucide-react";
import type { PictureData } from "@/hooks/usePictures";

interface PictureCardProps {
  picture: PictureData;
}

export function PictureCard({ picture }: PictureCardProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const firstImage = picture.images[0];

  if (!firstImage) return null;

  return (
    <>
      <Card
        className="overflow-hidden cursor-pointer group hover:shadow-lg transition-all duration-300"
        onClick={() => setSelectedImageIndex(0)}
      >
        <AspectRatio ratio={1}>
          <div className="relative w-full h-full">
            {firstImage.blurhash && (
              <div
                className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20"
                style={{
                  background: `linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--accent) / 0.2))`,
                }}
              />
            )}
            <img
              src={firstImage.url}
              alt={firstImage.alt || picture.title || "Picture"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            
            {/* Overlay with title and tags */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                {picture.title && (
                  <h3 className="font-semibold text-sm mb-1 line-clamp-1">
                    {picture.title}
                  </h3>
                )}
                {picture.description && (
                  <p className="text-xs opacity-90 line-clamp-2">
                    {picture.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {picture.location && (
                    <Badge variant="secondary" className="text-xs px-1 py-0 bg-white/20 text-white border-0">
                      <MapPin className="h-2.5 w-2.5 mr-0.5" />
                      {picture.location}
                    </Badge>
                  )}
                  {picture.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs px-1 py-0 bg-white/20 text-white border-0">
                      <Hash className="h-2.5 w-2.5 mr-0.5" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Multiple images indicator */}
            {picture.images.length > 1 && (
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-xs">
                  1/{picture.images.length}
                </Badge>
              </div>
            )}
          </div>
        </AspectRatio>
      </Card>

      {/* Lightbox Dialog */}
      <Dialog
        open={selectedImageIndex !== null}
        onOpenChange={(open) => !open && setSelectedImageIndex(null)}
      >
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {selectedImageIndex !== null && (
            <div className="relative">
              <img
                src={picture.images[selectedImageIndex].url}
                alt={picture.images[selectedImageIndex].alt || picture.title || "Picture"}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              
              {/* Navigation for multiple images */}
              {picture.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  {picture.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex(index);
                      }}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === selectedImageIndex
                          ? "bg-white"
                          : "bg-white/50 hover:bg-white/75"
                      }`}
                      aria-label={`View image ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}