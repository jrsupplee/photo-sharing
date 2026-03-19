import sharp from 'sharp';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { spawn } from 'child_process';
import { getStorage } from './storage/factory';

export interface ImageVariants {
  thumbnailKey: string;
  mediumKey: string;
}

/**
 * Extract a frame from a video buffer using ffmpeg and return it as a JPEG buffer.
 * Seeks to 1 second (or 0 if the video is shorter).
 */
async function extractVideoFrame(videoBuffer: Buffer, ext: string): Promise<Buffer> {
  const ffmpegPath: string = require('@ffmpeg-installer/ffmpeg').path;
  const tmpInput = path.join(os.tmpdir(), `vid_in_${Date.now()}${ext}`);
  const tmpOutput = path.join(os.tmpdir(), `vid_out_${Date.now()}.jpg`);
  fs.writeFileSync(tmpInput, videoBuffer);

  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(ffmpegPath, [
        '-ss', '00:00:01',
        '-i', tmpInput,
        '-frames:v', '1',
        '-q:v', '2',
        '-y',
        tmpOutput,
      ]);
      proc.on('close', (code) => {
        if (code === 0 || fs.existsSync(tmpOutput)) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
      proc.on('error', reject);
    });
    return fs.readFileSync(tmpOutput);
  } finally {
    for (const f of [tmpInput, tmpOutput]) {
      try { fs.unlinkSync(f); } catch { /* ignore */ }
    }
  }
}

/**
 * Generate thumbnail (400px) and medium (1200px) variants of an image or video.
 * Returns storage keys for both. Returns null for unsupported types.
 */
export async function generateImageVariants(
  buffer: Buffer,
  basePath: string, // e.g. "my-wedding/abc123"
  mimeType: string
): Promise<ImageVariants | null> {
  let sourceBuffer: Buffer;

  if (mimeType.startsWith('image/')) {
    sourceBuffer = buffer;
  } else if (mimeType.startsWith('video/')) {
    const ext = path.extname(basePath) || '.mp4';
    sourceBuffer = await extractVideoFrame(buffer, ext);
  } else {
    return null;
  }

  const storage = getStorage();
  const jpegExt = '.jpg';
  const dir = path.dirname(basePath);
  const base = path.basename(basePath, path.extname(basePath));

  const [thumbBuffer, mediumBuffer] = await Promise.all([
    sharp(sourceBuffer)
      .rotate() // auto-orient from EXIF
      .resize(400, undefined, { withoutEnlargement: true })
      .jpeg({ quality: 75, progressive: true })
      .toBuffer(),
    sharp(sourceBuffer)
      .rotate()
      .resize(1200, undefined, { withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer(),
  ]);

  const [thumbnailKey, mediumKey] = await Promise.all([
    storage.save(thumbBuffer, `${dir}/${base}_thumb${jpegExt}`, 'image/jpeg'),
    storage.save(mediumBuffer, `${dir}/${base}_medium${jpegExt}`, 'image/jpeg'),
  ]);

  return { thumbnailKey, mediumKey };
}
