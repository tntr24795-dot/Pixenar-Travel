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

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setActiveImage((current) => (current + 1) % HERO_IMAGES.length),
      6000
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {HERO_IMAGES.map((image, index) => (
        <Image
          key={image.src}
          src={image.src}
          alt=""
          fill
          priority={index === 0}
          sizes="100vw"
          className={`object-cover transition-[opacity,transform] duration-1000 ease-out ${image.cropClassName} ${
            index === activeImage ? "scale-100 opacity-100" : "scale-[1.03] opacity-0"
          }`}
        />
      ))}
    </div>
  );
}
