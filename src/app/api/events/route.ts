import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/getSession';
import { eventTable } from '@/lib/tables';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, slug, date_start, date_end, albums } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
  }

  if (await eventTable.slugExists(slug)) {
    return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
  }

  const event = await eventTable.insert(slug, name, date_start || null, date_end || null, albums || []);
  return NextResponse.json(event, { status: 201 });
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(await eventTable.listAll());
}
