import { NextRequest, NextResponse } from 'next/server';
import { mediaRepo, likeRepo } from '@/lib/repositories';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId = req.nextUrl.searchParams.get('session_id');

  const count = likeRepo.countByMediaId(id);
  const liked = sessionId ? likeRepo.exists(id, sessionId) : false;
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

  const media = mediaRepo.findById(id);
  if (!media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  const alreadyLiked = likeRepo.exists(id, session_id);
  if (alreadyLiked) {
    likeRepo.delete(id, session_id);
  } else {
    likeRepo.create(id, session_id);
  }

  const count = likeRepo.countByMediaId(id);
  return NextResponse.json({ count, liked: !alreadyLiked });
}
