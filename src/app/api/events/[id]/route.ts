import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/getSession';
import { eventTable, albumTable, mediaTable } from '@/lib/tables';
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

  for (const key of await mediaTable.getStorageKeysByEventId(id)) {
    try {
      await storage.delete(key);
    } catch {
      // Continue even if file deletion fails
    }
  }

  await eventTable.delete(id);
  return NextResponse.json({ success: true });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const { id } = await params;

  if (!await canManageEvent(session, id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, date_start, date_end, albums, default_album_name, require_name } = body;

  const event = await eventTable.update(id, name, date_start || null, date_end || null, !!require_name);

  if (albums && Array.isArray(albums)) {
    await albumTable.updateForEvent(id, albums);
  }

  const newAlbums = await albumTable.findByEventId(id);
  const defaultAlbum = default_album_name
    ? newAlbums.find(a => a.name === default_album_name) ?? null
    : null;
  await eventTable.setDefaultAlbum(id, defaultAlbum?.id ?? null);

  return NextResponse.json(event);
}
