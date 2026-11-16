import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import { getImageUrl, type ImageVariant } from "./images";
export { getImageUrl, type ImageVariant };

export const IMAGE_VARIANTS: Record<Exclude<ImageVariant, "original">, number> = {
  thumbnail: 400,
  medium: 800,
  large: 1600,
};

export interface StorageDriver {
  save(key: string, buffer: Buffer, contentType: string): Promise<string>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

class LocalStorageDriver implements StorageDriver {
  private baseDir: string;

  constructor() {
    const isServerless = !!process.env.VERCEL || !!process.env.NETLIFY;
    const defaultDir = isServerless ? path.join("/tmp", "uploads") : "./storage/uploads";
    this.baseDir = path.resolve(process.cwd(), process.env.LOCAL_STORAGE_DIR || defaultDir);
  }

  private async ensureDir(filePath: string) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  async save(key: string, buffer: Buffer): Promise<string> {
    const filePath = path.join(this.baseDir, key);
    await this.ensureDir(filePath);
    await fs.writeFile(filePath, buffer);
    return key;
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const filePath = path.join(this.baseDir, key);
      return await fs.readFile(filePath);
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = path.join(this.baseDir, key);
      await fs.unlink(filePath);
    } catch {
      // Ignorer si le fichier n'existe pas déjà
    }
  }

  getUrl(key: string): string {
    return `/media/${encodeURIComponent(key)}`;
  }
}

let driverInstance: StorageDriver | null = null;

export function getStorageDriver(): StorageDriver {
  if (!driverInstance) {
    // Par défaut, stockage local
    driverInstance = new LocalStorageDriver();
  }
  return driverInstance;
}

export type ProcessedImage = {
  baseKey: string;
  width: number;
  height: number;
  format: "webp";
};

/**
 * Traite une image importée :
 *  - Convertit en WebP optimisé
 *  - Supprime les métadonnées EXIF (sécurité & vie privée)
 *  - Génère 3 formats réactifs (400px, 800px, 1600px)
 */
export async function processAndSaveImage(
  fileBuffer: Buffer,
  prefix = "products"
): Promise<ProcessedImage> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharp = (await import("sharp")).default;
  const storage = getStorageDriver();

  const metadata = await sharp(fileBuffer).metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 800;

  const baseKey = `${prefix}/${crypto.randomUUID()}`;

  // Image optimisée principale / grand format
  const pipeline = sharp(fileBuffer).rotate(); // auto-rotate via EXIF avant suppression

  // Générer les variantes 400, 800, 1600
  for (const [variant, targetWidth] of Object.entries(IMAGE_VARIANTS)) {
    const resized = await pipeline
      .clone()
      .resize({ width: Math.min(targetWidth, width), withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    await storage.save(`${baseKey}-${variant}.webp`, resized, "image/webp");
  }

  return {
    baseKey,
    width,
    height,
    format: "webp",
  };
}


