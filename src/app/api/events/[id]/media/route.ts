import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getStorage } from '@/lib/storage/factory';
import { generateImageVariants } from '@/lib/imageVariants';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: slug } = await params;
  const db = getDb();

  const event = db.prepare('SELECT * FROM events WHERE slug = ?').get(slug) as { id: number } | undefined;
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const media = db.prepare(`
    SELECT m.*, a.name as album_name,
      (SELECT COUNT(*) FROM likes l WHERE l.media_id = m.id) as like_count,
      (SELECT COUNT(*) FROM comments c WHERE c.media_id = m.id) as comment_count
    FROM media m
    LEFT JOIN albums a ON m.album_id = a.id
    WHERE m.event_id = ?
    ORDER BY m.created_at DESC
  `).all(event.id);

  return NextResponse.json(media);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: slug } = await params;
  const db = getDb();

  const event = db.prepare('SELECT * FROM events WHERE slug = ?').get(slug) as { id: number } | undefined;
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const caption = formData.get('caption') as string | null;
  const uploaderName = formData.get('uploader_name') as string | null;
  const albumId = formData.get('album_id') as string | null;
  const sessionId = formData.get('session_id') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || '';
  const uuid = uuidv4();
  const filename = `${slug}/${uuid}${ext}`;

  const storage = getStorage();
  const [storageKey, variants] = await Promise.all([
    storage.save(buffer, filename, file.type),
    generateImageVariants(buffer, filename, file.type),
  ]);

  const result = db.prepare(`
    INSERT INTO media (event_id, album_id, filename, original_name, mime_type, size, caption, uploader_name, session_id, storage_key, thumbnail_key, medium_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    event.id,
    albumId ? parseInt(albumId) : null,
    filename,
    file.name,
    file.type,
    file.size,
    caption || null,
    uploaderName || null,
    sessionId || null,
    storageKey,
    variants?.thumbnailKey ?? null,
    variants?.mediumKey ?? null,
  );

  const media = db.prepare('SELECT * FROM media WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(media, { status: 201 });
}
