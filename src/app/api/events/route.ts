import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/getSession';
import getDb from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, slug, date_start, date_end, albums } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
  }

  const db = getDb();

  // Check if slug is taken
  const existing = db.prepare('SELECT id FROM events WHERE slug = ?').get(slug);
  if (existing) {
    return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
  }

  const insertEvent = db.prepare(`
    INSERT INTO events (slug, name, date_start, date_end)
    VALUES (?, ?, ?, ?)
  `);

  const insertAlbum = db.prepare(`
    INSERT INTO albums (event_id, name, "order")
    VALUES (?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    const result = insertEvent.run(slug, name, date_start || null, date_end || null);
    const eventId = result.lastInsertRowid;

    if (albums && Array.isArray(albums)) {
      albums.forEach((albumName: string, index: number) => {
        if (albumName.trim()) {
          insertAlbum.run(eventId, albumName.trim(), index);
        }
      });
    }

    return eventId;
  });

  const eventId = transaction();
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);

  return NextResponse.json(event, { status: 201 });
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const events = db.prepare('SELECT * FROM events ORDER BY created_at DESC').all();

  return NextResponse.json(events);
}
