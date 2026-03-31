import { NextRequest, NextResponse } from 'next/server';
import { albumTable, eventTable } from '@/lib/tables';
import { getSession } from '@/lib/getSession';
import { canManageEvent } from '@/lib/authorization';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const album = await albumTable.findById(id);
  if (!album) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 });
  }

  const session = await getSession();
  if (!await canManageEvent(session, album.event_id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  if (typeof body.read_only === 'boolean') {
    await albumTable.setReadOnly(id, body.read_only);
  }
  if (typeof body.hidden === 'boolean') {
    await albumTable.setHidden(id, body.hidden);
  }

  return NextResponse.json(await albumTable.findById(id));
}
