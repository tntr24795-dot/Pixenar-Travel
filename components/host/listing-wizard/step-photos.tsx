"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { GripVertical, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { ListingWizardData, WizardImage } from "@/components/host/listing-wizard/types";

const LISTING_IMAGES_BUCKET = "listing-images";
const MIN_IMAGES = 5;
/** Photos larger than this on their longest edge get downscaled before upload. */
const MAX_DIMENSION_PX = 2000;

interface StepPhotosProps {
  data: ListingWizardData;
  update: (patch: Partial<ListingWizardData>) => void;
  /**
   * Stable id used as the storage folder for this in-progress listing.
   * Generated once when the wizard opens and reused as the listing's `id`
   * on final submit, so photos can be uploaded before the `listings` row
   * exists.
   */
  draftId: string;
}

/**
 * Client-side downscale via <canvas> so large phone photos aren't uploaded
 * at full resolution. This is a best-effort resize, not full compression —
 * TODO: consider re-encoding to WebP at a target quality for smaller
 * uploads once a client-side image library is added to package.json.
 */
async function resizeImageIfNeeded(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const largestEdge = Math.max(bitmap.width, bitmap.height);
  if (largestEdge <= MAX_DIMENSION_PX) {
    return file;
  }

  const scale = MAX_DIMENSION_PX / largestEdge;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85)
  );
  return blob ?? file;
}

export function StepPhotos({ data, update, draftId }: StepPhotosProps) {
  const [uploading, setUploading] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const uploaded: WizardImage[] = [];
      let sortOrder = data.images.length;

      for (const file of Array.from(files)) {
        const blob = await resizeImageIfNeeded(file);
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${draftId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(LISTING_IMAGES_BUCKET)
          .upload(path, blob, {
            contentType: file.type || "image/jpeg",
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from(LISTING_IMAGES_BUCKET)
          .getPublicUrl(path);

        uploaded.push({
          clientId: crypto.randomUUID(),
          storagePath: path,
          publicUrl: publicUrlData.publicUrl,
          altText: "",
          sortOrder: sortOrder++,
          isCover: data.images.length === 0 && uploaded.length === 0,
        });
      }

      update({ images: [...data.images, ...uploaded] });
    } catch (error) {
      toast({
        title: "Upload failed",
        description:
          error instanceof Error
            ? error.message
            : "Couldn't upload one or more photos. Make sure the 'listing-images' storage bucket exists.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeImage(clientId: string) {
    const remaining = data.images.filter((img) => img.clientId !== clientId);
    // Best-effort delete from storage; ignore failures (not user-facing).
    const removed = data.images.find((img) => img.clientId === clientId);
    if (removed) {
      createClient().storage.from(LISTING_IMAGES_BUCKET).remove([removed.storagePath]).catch(() => {});
    }
    if (remaining.length > 0 && !remaining.some((img) => img.isCover)) {
      remaining[0] = { ...remaining[0], isCover: true };
    }
    update({ images: remaining.map((img, i) => ({ ...img, sortOrder: i })) });
  }

  function setCover(clientId: string) {
    update({
      images: data.images.map((img) => ({ ...img, isCover: img.clientId === clientId })),
    });
  }

  function handleDragStart(index: number) {
    dragIndex.current = index;
  }

  function handleDrop(index: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === index) return;

    const next = [...data.images];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    update({ images: next.map((img, i) => ({ ...img, sortOrder: i })) });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Add photos of your place</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload at least {MIN_IMAGES} photos. Drag to reorder; the star marks your cover photo.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-10 text-sm text-muted-foreground transition-colors hover:border-primary/50 disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <ImagePlus className="h-6 w-6" />
        )}
        {uploading ? "Uploading..." : "Click to choose photos"}
      </button>

      {data.images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {data.images.map((image, index) => (
            <div
              key={image.clientId}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-lg border border-border",
                image.isCover && "ring-2 ring-primary"
              )}
            >
              <Image
                src={image.publicUrl}
                alt={image.altText || "Listing photo"}
                fill
                sizes="200px"
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-1.5">
                <span className="rounded bg-black/50 p-1 text-white">
                  <GripVertical className="h-3.5 w-3.5" />
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    title="Set as cover photo"
                    onClick={() => setCover(image.clientId)}
                    className={cn(
                      "rounded bg-black/50 p-1 text-white hover:bg-black/70",
                      image.isCover && "text-amber-400"
                    )}
                  >
                    <Star className="h-3.5 w-3.5" fill={image.isCover ? "currentColor" : "none"} />
                  </button>
                  <button
                    type="button"
                    title="Remove photo"
                    onClick={() => removeImage(image.clientId)}
                    className="rounded bg-black/50 p-1 text-white hover:bg-black/70"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {image.isCover && (
                <span className="absolute bottom-1.5 left-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  Cover
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <p
        className={cn(
          "text-sm",
          data.images.length < MIN_IMAGES ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {data.images.length} of {MIN_IMAGES} minimum photos uploaded.
      </p>
    </div>
  );
}
