import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { eventTable, albumTable, mediaTable } from '@/lib/tables';
import { getSession } from '@/lib/getSession';
import GalleryClient from './GalleryClient';

interface Props {
  params: Promise<{ eventSlug: string }>;
}

export default async function EventPage({ params }: Props) {
  const { eventSlug } = await params;

  const event = eventTable.findBySlug(eventSlug);
  if (!event) notFound();

  const albums = albumTable.findByEventId(event.id);

  // Get or create session ID for likes
  const cookieStore = await cookies();
  let sessionId = cookieStore.get('session_id')?.value;
  if (!sessionId) {
    sessionId = uuidv4();
  }

  const media = mediaTable.findByEventIdForGallery(event.id, sessionId, null);

  const session = await getSession();
  const deletedMedia = session ? mediaTable.findDeletedByEventId(event.id) : [];

  return (
    <GalleryClient
      event={event}
      albums={albums}
      media={media}
      sessionId={sessionId}
      isAdmin={!!session}
      deletedMedia={deletedMedia}
    />
  );
}

export async function generateMetadata({ params }: Props) {
  const { eventSlug } = await params;
  try {
    const event = eventTable.findBySlug(eventSlug);
    if (event) {
      return { title: `${event.name} — Wedding Memories` };
    }
  } catch {
    // ignore
  }
  return { title: 'Wedding Memories' };
}
