import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/getSession';
import { userRepo } from '@/lib/repositories';
import { isAdmin } from '@/lib/authorization';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!isAdmin(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { email, name, password, role } = await req.json();

  if (role && role !== 'admin' && role !== 'event_manager') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const user = userRepo.update(id, { email, name, password, role });
  return NextResponse.json(user);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!isAdmin(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Prevent deleting yourself
  if (session!.user.id === id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  userRepo.delete(id);
  return NextResponse.json({ success: true });
}
