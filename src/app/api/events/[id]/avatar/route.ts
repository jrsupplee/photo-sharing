import { NextRequest, NextResponse } from 'next/server';
import { eventTable } from '@/lib/tables';
import { getSession } from '@/lib/getSession';
import { canManageEvent } from '@/lib/authorization';
import { getStorage } from '@/lib/storage/factory';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!await canManageEvent(session, id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const event = await eventTable.findById(id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const storage = getStorage();

  // Delete old avatar if it exists
  if (event.avatar_key) {
    try { await storage.delete(event.avatar_key); } catch { /* ignore */ }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `events/${event.slug}/avatar_${uuidv4()}.jpg`;
  const key = await storage.save(buffer, filename, 'image/jpeg');

  await eventTable.setAvatarKey(id, key);
  return NextResponse.json({ avatar_key: key });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!await canManageEvent(session, id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const event = await eventTable.findById(id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  if (event.avatar_key) {
    const storage = getStorage();
    try { await storage.delete(event.avatar_key); } catch { /* ignore */ }
    await eventTable.setAvatarKey(id, null);
  }

  return NextResponse.json({ success: true });
}
