import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/getSession';
import { eventRepo, albumRepo, mediaRepo } from '@/lib/repositories';
import { getStorage } from '@/lib/storage/factory';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
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
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, date_start, date_end, albums } = body;

  const event = eventRepo.update(id, name, date_start || null, date_end || null);

  if (albums && Array.isArray(albums)) {
    albumRepo.replaceForEvent(id, albums);
  }

  return NextResponse.json(event);
}
