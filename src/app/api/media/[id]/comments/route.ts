import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const comments = db.prepare(`
    SELECT * FROM comments WHERE media_id = ? ORDER BY created_at ASC
  `).all(id);

  return NextResponse.json(comments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { author_name, body: commentBody } = body;

  if (!author_name || !commentBody) {
    return NextResponse.json({ error: 'Author name and body are required' }, { status: 400 });
  }

  const db = getDb();

  // Check media exists
  const media = db.prepare('SELECT id FROM media WHERE id = ?').get(id);
  if (!media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  const result = db.prepare(`
    INSERT INTO comments (media_id, author_name, body) VALUES (?, ?, ?)
  `).run(id, author_name, commentBody);

  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(comment, { status: 201 });
}
