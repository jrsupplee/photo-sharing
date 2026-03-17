import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/getSession';
import getDb from '@/lib/db';
import { getStorage } from '@/lib/storage/factory';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { uploader_name, caption, session_id } = body;

  const db = getDb();
  const media = db.prepare('SELECT * FROM media WHERE id = ?').get(id) as { session_id: string | null } | undefined;
  if (!media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  const session = await getSession();
  if (!session && (!session_id || media.session_id !== session_id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  db.prepare('UPDATE media SET uploader_name = ?, caption = ? WHERE id = ?')
    .run(uploader_name || null, caption || null, id);

  const updated = db.prepare('SELECT * FROM media WHERE id = ?').get(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  const storage = getStorage();

  const media = db.prepare('SELECT * FROM media WHERE id = ?').get(id) as { storage_key: string } | undefined;
  if (!media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  try {
    await storage.delete(media.storage_key);
  } catch {
    // Continue even if file deletion fails
  }

  db.prepare('DELETE FROM media WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
