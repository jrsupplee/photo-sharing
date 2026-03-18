import { NextRequest, NextResponse } from 'next/server';
import { mediaTable, commentTable } from '@/lib/tables';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json(await commentTable.findByMediaId(id));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { author_name, body: commentBody, session_id } = body;

  if (!author_name || !commentBody) {
    return NextResponse.json({ error: 'Author name and body are required' }, { status: 400 });
  }

  const media = await mediaTable.findById(id);
  if (!media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  const comment = await commentTable.insert(id, author_name, commentBody, session_id || null);
  return NextResponse.json(comment, { status: 201 });
}
