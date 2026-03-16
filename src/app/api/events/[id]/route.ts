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

  // Get all media storage keys before deleting
  const mediaItems = db.prepare('SELECT storage_key FROM media WHERE event_id = ?').all(id) as { storage_key: string }[];

  // Delete all files from storage
  for (const item of mediaItems) {
    try {
      await storage.delete(item.storage_key);
    } catch {
      // Continue even if file deletion fails
    }
  }

  db.prepare('DELETE FROM events WHERE id = ?').run(id);

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

  const db = getDb();

  db.prepare(`
    UPDATE events SET name = ?, date_start = ?, date_end = ? WHERE id = ?
  `).run(name, date_start || null, date_end || null, id);

  // Replace albums
  if (albums && Array.isArray(albums)) {
    db.prepare('DELETE FROM albums WHERE event_id = ?').run(id);
    const insertAlbum = db.prepare(`
      INSERT INTO albums (event_id, name, "order") VALUES (?, ?, ?)
    `);
    albums.forEach((albumName: string, index: number) => {
      if (albumName.trim()) {
        insertAlbum.run(id, albumName.trim(), index);
      }
    });
  }

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  return NextResponse.json(event);
}
