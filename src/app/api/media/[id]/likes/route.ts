import { NextRequest, NextResponse } from 'next/server';
import { mediaTable, likeTable } from '@/lib/tables';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId = req.nextUrl.searchParams.get('session_id');

  const count = await likeTable.countByMediaId(id);
  const liked = sessionId ? await likeTable.exists(id, sessionId) : false;
  return NextResponse.json({ count, liked });
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

  const media = await mediaTable.findById(id);
  if (!media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  const alreadyLiked = await likeTable.exists(id, session_id);
  if (alreadyLiked) {
    await likeTable.delete(id, session_id);
  } else {
    await likeTable.insert(id, session_id);
  }

  const count = await likeTable.countByMediaId(id);
  return NextResponse.json({ count, liked: !alreadyLiked });
}
