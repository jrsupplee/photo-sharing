import { NextResponse } from 'next/server';
import { getSession } from '@/lib/getSession';
import getDb from '@/lib/db';
import { getStorage } from '@/lib/storage/factory';
import { generateImageVariants } from '@/lib/imageVariants';
import fs from 'fs';
import path from 'path';

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');
  const storage = getStorage();

  const missing = db.prepare(`
    SELECT id, storage_key, mime_type FROM media
    WHERE mime_type LIKE 'image/%'
      AND (thumbnail_key IS NULL OR medium_key IS NULL)
  `).all() as { id: number; storage_key: string; mime_type: string }[];

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
        db.prepare(`
          UPDATE media SET thumbnail_key = ?, medium_key = ? WHERE id = ?
        `).run(variants.thumbnailKey, variants.mediumKey, item.id);
        processed++;
      }
    } catch (err) {
      errors.push(`id=${item.id}: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  void storage; // storage abstraction used inside generateImageVariants

  return NextResponse.json({ total: missing.length, processed, failed, errors });
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const total = (db.prepare(`SELECT COUNT(*) as n FROM media WHERE mime_type LIKE 'image/%'`).get() as { n: number }).n;
  const missing = (db.prepare(`
    SELECT COUNT(*) as n FROM media
    WHERE mime_type LIKE 'image/%'
      AND (thumbnail_key IS NULL OR medium_key IS NULL)
  `).get() as { n: number }).n;

  return NextResponse.json({ total, missing });
}
