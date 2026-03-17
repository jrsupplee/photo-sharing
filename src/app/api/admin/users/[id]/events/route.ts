import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/getSession';
import { eventPermissionRepo } from '@/lib/repositories';
import { isAdmin } from '@/lib/authorization';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!isAdmin(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const event_ids = eventPermissionRepo.getEventIdsForUser(id);
  return NextResponse.json({ event_ids });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!isAdmin(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { event_ids } = await req.json();

  if (!Array.isArray(event_ids)) {
    return NextResponse.json({ error: 'event_ids must be an array' }, { status: 400 });
  }

  eventPermissionRepo.setForUser(id, event_ids);
  return NextResponse.json({ success: true });
}
