"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface GalleryImage {
  id: string;
  publicUrl: string;
  altText: string | null;
}

export interface GalleryProps {
  images: GalleryImage[];
  title: string;
}

/** Simple image grid + lightbox for the listing detail page. */
export function Gallery({ images, title }: GalleryProps) {
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);

  if (images.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
        No photos yet
      </div>
    );
  }

  const shown = images.slice(0, 5);

  function openAt(i: number) {
    setIndex(i);
    setOpen(true);
  }

  return (
    <>
      <div
        className={cn(
          "grid h-[420px] gap-2 overflow-hidden rounded-xl",
          shown.length === 1 ? "grid-cols-1" : "grid-cols-4 grid-rows-2"
        )}
      >
        <button
          type="button"
          onClick={() => openAt(0)}
          className={cn("relative", shown.length === 1 ? "col-span-1 row-span-1" : "col-span-2 row-span-2")}
        >
          <Image
            src={shown[0].publicUrl}
            alt={shown[0].altText ?? title}
            fill
            sizes="50vw"
            priority
            className="object-cover"
          />
        </button>
        {shown.slice(1).map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => openAt(i + 1)}
            className="relative col-span-1 row-span-1 hidden sm:block"
          >
            <Image src={img.publicUrl} alt={img.altText ?? title} fill sizes="25vw" className="object-cover" />
          </button>
        ))}
      </div>

      {images.length > 1 && (
        <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={() => openAt(0)}>
          <Expand className="h-4 w-4" />
          Show all {images.length} photos
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <div className="relative aspect-video w-full">
            <Image
              src={images[index].publicUrl}
              alt={images[index].altText ?? title}
              fill
              sizes="90vw"
              className="object-contain"
            />
          </div>
          {images.length > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {index + 1} / {images.length}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIndex((i) => (i + 1) % images.length)}
                aria-label="Next photo"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
