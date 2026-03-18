import { NextRequest, NextResponse } from 'next/server';
import { eventTable, mediaTable } from '@/lib/tables';
import { generateImageVariants } from '@/lib/imageVariants';
import { getStorage } from '@/lib/storage/factory';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import crypto from 'crypto';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: slug } = await params;

  const event = await eventTable.findBySlug(slug);
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  return NextResponse.json(await mediaTable.findByEventSlug(slug));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: slug } = await params;

  const event = await eventTable.findBySlug(slug);
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
  const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

  const existing = await mediaTable.findByHash(event.id, fileHash);
  if (existing) {
    if (!existing.deleted_at) {
      return NextResponse.json({ error: 'This photo has already been uploaded to this event.' }, { status: 409 });
    }
    // Previously deleted — restore it with the new metadata
    await mediaTable.restore(existing.id, {
      uploader_name: uploaderName || null,
      caption: caption || null,
      album_id: albumId ? parseInt(albumId) : null,
      session_id: sessionId || null,
    });
    return NextResponse.json(await mediaTable.findById(existing.id), { status: 200 });
  }

  const ext = path.extname(file.name) || '';
  const uuid = uuidv4();
  const filename = `${slug}/${uuid}${ext}`;

  const storage = getStorage();
  const [storageKey, variants] = await Promise.all([
    storage.save(buffer, filename, file.type),
    generateImageVariants(buffer, filename, file.type),
  ]);

  const media = await mediaTable.insert({
    event_id: event.id,
    album_id: albumId ? parseInt(albumId) : null,
    filename,
    original_name: file.name,
    mime_type: file.type,
    size: file.size,
    caption: caption || null,
    uploader_name: uploaderName || null,
    session_id: sessionId || null,
    storage_key: storageKey,
    thumbnail_key: variants?.thumbnailKey ?? null,
    medium_key: variants?.mediumKey ?? null,
    file_hash: fileHash,
  });

  return NextResponse.json(media, { status: 201 });
}
