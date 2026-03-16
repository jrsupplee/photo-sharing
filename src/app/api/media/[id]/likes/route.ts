import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId = req.nextUrl.searchParams.get('session_id');
  const db = getDb();

  const result = db.prepare('SELECT COUNT(*) as count FROM likes WHERE media_id = ?').get(id) as { count: number };
  const liked = sessionId
    ? !!db.prepare('SELECT id FROM likes WHERE media_id = ? AND session_id = ?').get(id, sessionId)
    : false;
  return NextResponse.json({ count: result.count, liked });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { session_id } = body;

  if (!session_id) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }

  const db = getDb();

  // Check media exists
  const media = db.prepare('SELECT id FROM media WHERE id = ?').get(id);
  if (!media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  // Check if already liked
  const existing = db.prepare('SELECT id FROM likes WHERE media_id = ? AND session_id = ?').get(id, session_id);

  if (existing) {
    // Unlike
    db.prepare('DELETE FROM likes WHERE media_id = ? AND session_id = ?').run(id, session_id);
  } else {
    // Like
    db.prepare('INSERT INTO likes (media_id, session_id) VALUES (?, ?)').run(id, session_id);
  }

  const result = db.prepare('SELECT COUNT(*) as count FROM likes WHERE media_id = ?').get(id) as { count: number };
  return NextResponse.json({ count: result.count, liked: !existing });
}
