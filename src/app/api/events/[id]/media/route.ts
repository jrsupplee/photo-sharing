import { NextRequest, NextResponse } from 'next/server';
import { eventRepo, mediaRepo } from '@/lib/repositories';
import { generateImageVariants } from '@/lib/imageVariants';
import { getStorage } from '@/lib/storage/factory';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: slug } = await params;

  const event = eventRepo.findBySlug(slug);
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  return NextResponse.json(mediaRepo.findByEventSlug(slug));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: slug } = await params;

  const event = eventRepo.findBySlug(slug);
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

  const media = mediaRepo.create({
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
  });

  return NextResponse.json(media, { status: 201 });
}
