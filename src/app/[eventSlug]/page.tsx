import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { eventRepo, albumRepo, mediaRepo } from '@/lib/repositories';
import { getSession } from '@/lib/getSession';
import GalleryClient from './GalleryClient';

interface Props {
  params: Promise<{ eventSlug: string }>;
}

export default async function EventPage({ params }: Props) {
  const { eventSlug } = await params;

  const event = eventRepo.findBySlug(eventSlug);
  if (!event) notFound();

  const albums = albumRepo.findByEventId(event.id);

  // Get or create session ID for likes
  const cookieStore = await cookies();
  let sessionId = cookieStore.get('session_id')?.value;
  if (!sessionId) {
    sessionId = uuidv4();
  }

  const media = mediaRepo.findByEventIdForGallery(event.id, sessionId, null);

  const session = await getSession();

  return (
    <GalleryClient
      event={event}
      albums={albums}
      media={media}
      sessionId={sessionId}
      isAdmin={!!session}
    />
  );
}

export async function generateMetadata({ params }: Props) {
  const { eventSlug } = await params;
  try {
    const event = eventRepo.findBySlug(eventSlug);
    if (event) {
      return { title: `${event.name} — Wedding Memories` };
    }
  } catch {
    // ignore
  }
  return { title: 'Wedding Memories' };
}
