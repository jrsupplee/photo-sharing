import { NextResponse } from 'next/server';
import { getSession } from '@/lib/getSession';
import { mediaTable } from '@/lib/tables';
import { generateImageVariants } from '@/lib/imageVariants';
import fs from 'fs';
import path from 'path';

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');
  const missing = mediaTable.findMissingVariants();

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const item of missing) {
    try {
      const filePath = path.join(uploadDir, item.storage_key);
      if (!fs.existsSync(filePath)) {
        errors.push(`Missing file: ${item.storage_key}`);
        failed++;
        continue;
      }

      const buffer = await fs.promises.readFile(filePath);
      const variants = await generateImageVariants(buffer, item.storage_key, item.mime_type);

      if (variants) {
        mediaTable.updateVariants(item.id, variants.thumbnailKey, variants.mediumKey);
        processed++;
      }
    } catch (err) {
      errors.push(`id=${item.id}: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  return NextResponse.json({ total: missing.length, processed, failed, errors });
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    total: mediaTable.countImages(),
    missing: mediaTable.countMissingVariants(),
  });
}
