import { useSeoMeta } from '@unhead/react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PictureGrid } from '@/components/gallery/PictureGrid';
import { usePictures } from '@/hooks/usePictures';
import { Camera } from 'lucide-react';

const Photos = () => {
  useSeoMeta({
    title: 'Photos - Peachy',
    description: 'Browse Peachy\'s photo gallery on Nostr.',
  });

  const { data: pictures = [], isLoading } = usePictures(50);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
            <Camera className="h-10 w-10 text-primary" />
            Photo Gallery
          </h1>
          <p className="text-lg text-muted-foreground">
            Browse through Peachy's collection of photos and memories.
          </p>
        </div>

        <PictureGrid 
          pictures={pictures} 
          isLoading={isLoading}
          columns={4}
        />
      </div>
    </MainLayout>
  );
};

export default Photos;