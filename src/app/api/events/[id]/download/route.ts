import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/getSession';
import { eventRepo, mediaRepo } from '@/lib/repositories';
import { canManageEvent } from '@/lib/authorization';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const { id: slug } = await params;

  const event = eventRepo.findBySlug(slug);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  if (!canManageEvent(session, event.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const albumIdParam = req.nextUrl.searchParams.get('album_id');
  const albumId = albumIdParam ? parseInt(albumIdParam) : null;

  let media = mediaRepo.findByEventId(event.id);
  if (albumId) {
    media = media.filter(m => m.album_id === albumId);
  }

  const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');

  const archive = archiver('zip', { zlib: { level: 5 } });

  // Deduplicate filenames within each folder
  const nameCounters = new Map<string, number>();
  for (const item of media) {
    const folder = albumId ? null : (item.album_name || 'Uncategorized');
    const ext = path.extname(item.original_name);
    const base = path.basename(item.original_name, ext);
    const key = folder ? `${folder}/${item.original_name}` : item.original_name;
    const count = nameCounters.get(key) ?? 0;
    nameCounters.set(key, count + 1);

    let entryName: string;
    if (count === 0) {
      entryName = folder ? `${folder}/${item.original_name}` : item.original_name;
    } else {
      const deduped = `${base} (${count})${ext}`;
      entryName = folder ? `${folder}/${deduped}` : deduped;
    }

    const filePath = path.join(uploadDir, item.storage_key);
    archive.file(filePath, { name: entryName });
  }

  archive.finalize();

  const passThrough = new PassThrough();
  archive.pipe(passThrough);

  const readable = new ReadableStream({
    start(controller) {
      passThrough.on('data', chunk => controller.enqueue(chunk));
      passThrough.on('end', () => controller.close());
      passThrough.on('error', err => controller.error(err));
    },
  });

  const zipName = albumId
    ? `${event.slug}-album-${albumId}.zip`
    : `${event.slug}.zip`;

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipName}"`,
    },
  });
}
