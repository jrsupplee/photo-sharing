import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/getSession';
import { mediaRepo } from '@/lib/repositories';
import { getStorage } from '@/lib/storage/factory';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { uploader_name, caption, session_id } = body;

  const media = mediaRepo.findById(id);
  if (!media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  const session = await getSession();
  if (!session && (!session_id || media.session_id !== session_id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const updated = mediaRepo.update(id, uploader_name || null, caption || null);
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const media = mediaRepo.findById(id);
  if (!media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  const storage = getStorage();
  try {
    await storage.delete(media.storage_key);
  } catch {
    // Continue even if file deletion fails
  }

  mediaRepo.delete(id);
  return NextResponse.json({ success: true });
}
