"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const HERO_IMAGES = [
  {
    src: "/images/home-kitchen.webp",
    alt: "A bright modern kitchen with warm wood floors",
    cropClassName: "object-center",
  },
  {
    src: "/images/home-living-room.webp",
    alt: "A calm, sunlit living room",
    cropClassName: "object-center md:object-[center_68%]",
  },
  {
    src: "/images/home-bedroom.webp",
    alt: "A refined bedroom overlooking the city",
    cropClassName: "object-center",
  },
] as const;

export function HomepageHeroBackdrop() {
  const [activeImage, setActiveImage] = useState(0);
  const [failedImages, setFailedImages] = useState<number[]>([]);

  useEffect(() => {
    HERO_IMAGES.forEach((image) => {
      const preload = new window.Image();
      preload.src = image.src;
    });
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActiveImage((current) => {
        for (let offset = 1; offset <= HERO_IMAGES.length; offset += 1) {
          const candidate = (current + offset) % HERO_IMAGES.length;
          if (!failedImages.includes(candidate)) return candidate;
        }
        return current;
      });
    }, 6000);

    return () => window.clearInterval(timer);
  }, [failedImages]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-havena-ink" aria-hidden="true">
      {HERO_IMAGES.map((image, index) => (
        <Image
          key={image.src}
          src={image.src}
          alt=""
          fill
          priority={index === 0}
          quality={92}
          sizes="100vw"
          onError={() => setFailedImages((current) => current.includes(index) ? current : [...current, index])}
          className={`object-cover transition-[opacity,transform] duration-1000 ease-out ${image.cropClassName} ${
            index === activeImage && !failedImages.includes(index)
              ? "scale-100 opacity-100"
              : "pointer-events-none scale-[1.025] opacity-0"
          }`}
        />
      ))}
    </div>
  );
}
