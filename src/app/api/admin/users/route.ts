import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/getSession';
import { userRepo } from '@/lib/repositories';
import { isAdmin } from '@/lib/authorization';

export async function GET() {
  const session = await getSession();
  if (!isAdmin(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(userRepo.list());
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!isAdmin(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { email, name, password, role } = await req.json();
  if (!email || !name || !password || !role) {
    return NextResponse.json({ error: 'email, name, password, and role are required' }, { status: 400 });
  }
  if (role !== 'admin' && role !== 'event_manager') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }
  if (userRepo.findByEmail(email)) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
  }

  const user = userRepo.create(email, name, password, role);
  return NextResponse.json(user, { status: 201 });
}
