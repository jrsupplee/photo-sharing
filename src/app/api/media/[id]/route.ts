import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/getSession';
import { mediaTable } from '@/lib/tables';
import { canManageEvent } from '@/lib/authorization';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { uploader_name, caption, session_id } = body;

  const media = mediaTable.findById(id);
  if (!media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  const session = await getSession();
  if (!session && (!session_id || media.session_id !== session_id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const updated = mediaTable.update(id, uploader_name || null, caption || null);
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const { id } = await params;

  const media = mediaTable.findById(id);
  if (!media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  const sessionId = req.nextUrl.searchParams.get('session_id');
  const isOwner = sessionId != null && media.session_id === sessionId;

  if (!canManageEvent(session, media.event_id) && !isOwner) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const deletedBy = session?.user?.session_id ?? sessionId ?? null;
  mediaTable.softDelete(id, deletedBy);
  return NextResponse.json({ success: true });
}
