"use client";

import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import { RefreshCw } from "lucide-react";
import { getActiveCarouselImages } from "@/app/actions/carousel";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1550505096-7ed980753b76?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1585933646706-7b8398453e14?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1527668744158-b64808d249f7?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1543335785-84f7bb54c933?q=80&w=1000&auto=format&fit=crop"
];

export function AuthCarousel() {
  const [images, setImages] = React.useState<string[]>(FALLBACK_IMAGES);
  const [loadedImages, setLoadedImages] = React.useState<Record<number, boolean>>({});
  const plugin = React.useRef(
    Autoplay({ delay: 3000, stopOnInteraction: false })
  );

  React.useEffect(() => {
    async function loadImages() {
      const dbImages = await getActiveCarouselImages();
      if (dbImages && dbImages.length > 0) {
        setImages(dbImages.map((img) => img.cloudinary_url));
      }
    }
    loadImages();
  }, []);

  return (
    <div className="absolute inset-0 p-4 flex items-center justify-center">
      <Carousel
        plugins={[plugin.current]}
        className="w-full h-full rounded-2xl overflow-hidden relative [&>div]:h-full"
        opts={{
          loop: true,
          duration: 40,
        }}
      >
        <CarouselContent className="h-full ml-0">
          {images.map((src, index) => (
            <CarouselItem key={src + index} className="pl-0 h-full relative w-full flex-none">
              {!loadedImages[index] && (
                <div className="absolute inset-0 flex items-center justify-center bg-sky-50 animate-pulse">
                  <RefreshCw className="w-8 h-8 text-[#2FA9D9] animate-spin opacity-50" />
                </div>
              )}
              <Image
                src={src}
                alt={`Water station slide ${index + 1}`}
                fill
                className={`object-cover transition-opacity duration-500 ${loadedImages[index] ? "opacity-100" : "opacity-0"}`}
                priority={index === 0}
                onLoad={() => setLoadedImages((prev) => ({ ...prev, [index]: true }))}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}

