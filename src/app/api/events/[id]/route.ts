import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/getSession';
import { eventRepo, albumRepo, mediaRepo } from '@/lib/repositories';
import { getStorage } from '@/lib/storage/factory';
import { isAdmin, canManageEvent } from '@/lib/authorization';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const storage = getStorage();

  for (const key of mediaRepo.getStorageKeysByEventId(id)) {
    try {
      await storage.delete(key);
    } catch {
      // Continue even if file deletion fails
    }
  }

  eventRepo.delete(id);
  return NextResponse.json({ success: true });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const { id } = await params;

  if (!canManageEvent(session, id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, date_start, date_end, albums, default_album_name } = body;

  const event = eventRepo.update(id, name, date_start || null, date_end || null);

  if (albums && Array.isArray(albums)) {
    albumRepo.replaceForEvent(id, albums);
  }

  // Resolve default album by name after replacement (IDs change on every replace)
  const newAlbums = albumRepo.findByEventId(id);
  const defaultAlbum = default_album_name
    ? newAlbums.find(a => a.name === default_album_name) ?? null
    : null;
  eventRepo.setDefaultAlbum(id, defaultAlbum?.id ?? null);

  return NextResponse.json(event);
}
