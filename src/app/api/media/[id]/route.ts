import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/getSession';
import getDb from '@/lib/db';
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
