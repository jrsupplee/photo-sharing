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

  const event = await eventTable.findBySlug(eventSlug);
  if (!event) notFound();

  const albums = await albumTable.findByEventId(event.id);

  // Get or create session ID for likes
  const cookieStore = await cookies();
  let sessionId = cookieStore.get('session_id')?.value;
  if (!sessionId) {
    sessionId = uuidv4();
  }

  const media = await mediaTable.findByEventIdForGallery(event.id, sessionId, null);

  const session = await getSession();
  const deletedMedia = session ? await mediaTable.findDeletedByEventId(event.id) : [];

  const refreshInterval = process.env.GALLERY_REFRESH_INTERVAL
    ? parseInt(process.env.GALLERY_REFRESH_INTERVAL, 10) * 1000
    : null;

  return (
    <GalleryClient
      event={event}
      albums={albums}
      media={media}
      sessionId={sessionId}
      isAdmin={!!session}
      deletedMedia={deletedMedia}
      refreshInterval={refreshInterval}
    />
  );
}

export async function generateMetadata({ params }: Props) {
  const { eventSlug } = await params;
  try {
    const event = await eventTable.findBySlug(eventSlug);
    if (event) {
      return { title: `${event.name} — Wedding Memories` };
    }
  } catch {
    // ignore
  }
  return { title: 'Wedding Memories' };
}
