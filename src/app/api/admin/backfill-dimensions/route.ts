import { NextResponse } from 'next/server';
import { getSession } from '@/lib/getSession';
import { mediaTable } from '@/lib/tables';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');

function resolveKey(key: string | null, fallback: string): string {
  return path.join(UPLOAD_DIR, key ?? fallback);
}

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const missing = await mediaTable.findMissingDimensions();

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const item of missing) {
    try {
      const filePath = resolveKey(item.medium_key, item.storage_key);
      if (!fs.existsSync(filePath)) {
        errors.push(`Missing file: ${item.medium_key ?? item.storage_key}`);
        failed++;
        continue;
      }

      const buffer = await fs.promises.readFile(filePath);
      const meta = await sharp(buffer).metadata();
      let { width, height } = meta;
      // EXIF orientations 5-8 indicate 90°/270° rotation — swap stored pixel dims
      if (meta.orientation && meta.orientation >= 5 && meta.orientation <= 8) {
        [width, height] = [height, width];
      }

      if (!width || !height) {
        errors.push(`Could not read dimensions for id=${item.id}`);
        failed++;
        continue;
      }

      await mediaTable.updateDimensions(item.id, width, height);
      processed++;
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

  return NextResponse.json({ missing: await mediaTable.countMissingDimensions() });
}
