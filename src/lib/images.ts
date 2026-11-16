export type ImageVariant = "thumbnail" | "medium" | "large" | "original";

export function getImageUrl(
  baseKey: string | null | undefined,
  variant: ImageVariant = "medium"
): string | null {
  if (!baseKey) return null;
  if (baseKey.startsWith("/") || baseKey.startsWith("http://") || baseKey.startsWith("https://")) {
    return baseKey;
  }
  const suffix = variant === "original" ? "-large.webp" : `-${variant}.webp`;
  return `/media/${encodeURIComponent(`${baseKey}${suffix}`)}`;
}

