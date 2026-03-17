import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { eventRepo, albumRepo, mediaRepo } from '@/lib/repositories';
import GalleryClient from './GalleryClient';

interface Props {
  params: Promise<{ eventSlug: string }>;
  searchParams: Promise<{ album?: string }>;
}

export default async function EventPage({ params, searchParams }: Props) {
  const { eventSlug } = await params;
  const { album: albumFilter } = await searchParams;

  const event = eventRepo.findBySlug(eventSlug);
  if (!event) notFound();

  const albums = albumRepo.findByEventId(event.id);

  // Get or create session ID for likes
  const cookieStore = await cookies();
  let sessionId = cookieStore.get('session_id')?.value;
  if (!sessionId) {
    sessionId = uuidv4();
  }

  const selectedAlbum = albumFilter ? albums.find(a => a.id === parseInt(albumFilter)) : null;
  const media = mediaRepo.findByEventIdForGallery(event.id, sessionId, selectedAlbum?.id ?? null);

  return (
    <GalleryClient
      event={event}
      albums={albums}
      media={media}
      sessionId={sessionId}
      currentAlbumId={albumFilter ? parseInt(albumFilter) : null}
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
