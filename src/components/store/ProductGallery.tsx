"use client";

import { useState } from "react";
import { getImageUrl } from "@/lib/images";

export function ProductGallery({
  images,
  productName,
  aspectRatio = "square",
}: {
  images: { storageKey: string; alt?: string | null; isMain?: boolean }[];
  productName: string;
  aspectRatio?: "square" | "portrait" | "landscape";
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="w-full aspect-square rounded-[var(--theme-radius-card)] bg-black/5 flex flex-col items-center justify-center text-muted-foreground/40 text-sm">
        <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>Aucune photo</span>
      </div>
    );
  }

  const selectedImage = images[selectedIndex] || images[0];
  const mainUrl = getImageUrl(selectedImage.storageKey, "large");

  const aspectClass =
    aspectRatio === "portrait"
      ? "aspect-[3/4]"
      : aspectRatio === "landscape"
      ? "aspect-video"
      : "aspect-square";

  return (
    <div className="space-y-3">
      {/* 1. IMAGE PRINCIPALE DU PRODUIT */}
      <div
        className={`relative w-full ${aspectClass} rounded-[var(--theme-radius-card)] overflow-hidden bg-black/5 border border-[var(--theme-border)] shadow-xs`}
      >
        {mainUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mainUrl}
            alt={selectedImage.alt || productName}
            className="w-full h-full object-cover object-center transition-all duration-300"
          />
        )}
      </div>

      {/* 2. GALERIE DES IMAGES SECONDAIRES */}
      {images.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {images.map((img, idx) => {
            const thumbUrl = getImageUrl(img.storageKey, "thumbnail");
            const isCurrent = idx === selectedIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all ${
                  isCurrent
                    ? "border-[var(--theme-primary)] ring-2 ring-black/10 scale-95"
                    : "border-[var(--theme-border)] opacity-70 hover:opacity-100"
                }`}
              >
                {thumbUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbUrl}
                    alt={img.alt || `${productName} ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
