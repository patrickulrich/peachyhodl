import { PictureCard } from "./PictureCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { RelaySelector } from "@/components/RelaySelector";
import type { PictureData } from "@/hooks/usePictures";

interface PictureGridProps {
  pictures: PictureData[];
  isLoading?: boolean;
  columns?: number;
}

export function PictureGrid({ pictures, isLoading, columns = 3 }: PictureGridProps) {
  if (isLoading) {
    return (
      <div
        className={`grid gap-4`}
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${
            columns === 2 ? "280px" : columns === 4 ? "200px" : "240px"
          }, 1fr))`,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (pictures.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 px-8 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <p className="text-muted-foreground">
              No pictures found. Try another relay?
            </p>
            <RelaySelector className="w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className={`grid gap-4`}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${
          columns === 2 ? "280px" : columns === 4 ? "200px" : "240px"
        }, 1fr))`,
      }}
    >
      {pictures.map((picture) => (
        <PictureCard key={picture.event.id} picture={picture} />
      ))}
    </div>
  );
}