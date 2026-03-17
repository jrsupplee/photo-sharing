import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/getSession';
import { mediaRepo } from '@/lib/repositories';
import { canManageEvent } from '@/lib/authorization';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const { id } = await params;

  const media = mediaRepo.findById(id);
  if (!media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  if (!canManageEvent(session, media.event_id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  mediaRepo.restore(id);
  return NextResponse.json({ success: true });
}
