import sharp from 'sharp';
import path from 'path';
import { getStorage } from './storage/factory';

export interface ImageVariants {
  thumbnailKey: string;
  mediumKey: string;
}

/**
 * Generate thumbnail (400px) and medium (1200px) variants of an image.
 * Returns storage keys for both. Only processes image/* mime types.
 */
export async function generateImageVariants(
  buffer: Buffer,
  basePath: string, // e.g. "my-wedding/abc123"
  mimeType: string
): Promise<ImageVariants | null> {
  if (!mimeType.startsWith('image/')) return null;

  const storage = getStorage();
  const ext = '.jpg';
  const dir = path.dirname(basePath);
  const base = path.basename(basePath, path.extname(basePath));

  const [thumbBuffer, mediumBuffer] = await Promise.all([
    sharp(buffer)
      .rotate() // auto-orient from EXIF
      .resize(400, undefined, { withoutEnlargement: true })
      .jpeg({ quality: 75, progressive: true })
      .toBuffer(),
    sharp(buffer)
      .rotate()
      .resize(1200, undefined, { withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer(),
  ]);

  const [thumbnailKey, mediumKey] = await Promise.all([
    storage.save(thumbBuffer, `${dir}/${base}_thumb${ext}`, 'image/jpeg'),
    storage.save(mediumBuffer, `${dir}/${base}_medium${ext}`, 'image/jpeg'),
  ]);

  return { thumbnailKey, mediumKey };
}
