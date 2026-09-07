"use client";

import { useEffect, useState } from "react";

const HERO_IMAGES = [
  {
    src: "/images/home-kitchen.webp",
    cropClassName: "object-center",
  },
  {
    src: "/images/home-living-room.webp",
    cropClassName: "object-center md:object-[center_68%]",
  },
  {
    // Temporary diagnostic: use the exact bedroom asset from the commit
    // immediately before the sharper-image replacement.
    src: "https://raw.githubusercontent.com/tntr24795-dot/Pixenar-Travel/dd5465936a5da8c8ece4bd733ba173791abf3058/public/images/home-bedroom.webp",
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
        <img
          key={image.src}
          src={image.src}
          alt=""
          loading={index === 0 ? "eager" : "lazy"}
          decoding="async"
          onError={() =>
            setFailedImages((current) =>
              current.includes(index) ? current : [...current, index]
            )
          }
          className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-1000 ease-out ${image.cropClassName} ${
            index === activeImage && !failedImages.includes(index)
              ? "scale-100 opacity-100"
              : "pointer-events-none scale-[1.025] opacity-0"
          }`}
        />
      ))}
    </div>
  );
}
