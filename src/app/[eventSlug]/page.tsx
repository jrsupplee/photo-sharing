import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import getDb from '@/lib/db';
import { Event, Album, Media } from '@/types';
import GalleryClient from './GalleryClient';

interface Props {
  params: Promise<{ eventSlug: string }>;
  searchParams: Promise<{ album?: string }>;
}

export default async function EventPage({ params, searchParams }: Props) {
  const { eventSlug } = await params;
  const { album: albumFilter } = await searchParams;
  const db = getDb();

  const event = db.prepare('SELECT * FROM events WHERE slug = ?').get(eventSlug) as Event | undefined;
  if (!event) notFound();

  const albums = db.prepare('SELECT * FROM albums WHERE event_id = ? ORDER BY "order" ASC').all(event.id) as Album[];

  let mediaQuery = `
    SELECT m.*, a.name as album_name,
      (SELECT COUNT(*) FROM likes l WHERE l.media_id = m.id) as like_count,
      (SELECT COUNT(*) FROM comments c WHERE c.media_id = m.id) as comment_count
    FROM media m
    LEFT JOIN albums a ON m.album_id = a.id
    WHERE m.event_id = ?
  `;

  let mediaParams: (string | number)[] = [event.id];

  if (albumFilter) {
    const selectedAlbum = albums.find(a => a.id === parseInt(albumFilter));
    if (selectedAlbum) {
      mediaQuery += ' AND m.album_id = ?';
      mediaParams = [event.id, selectedAlbum.id];
    }
  }

  mediaQuery += ' ORDER BY m.created_at DESC';
  const media = db.prepare(mediaQuery).all(...mediaParams) as Media[];

  // Get or create session ID for likes
  const cookieStore = await cookies();
  let sessionId = cookieStore.get('session_id')?.value;
  if (!sessionId) {
    sessionId = uuidv4();
  }

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
    const db = getDb();
    const event = db.prepare('SELECT * FROM events WHERE slug = ?').get(eventSlug) as Event | undefined;
    if (event) {
      return { title: `${event.name} — Wedding Memories` };
    }
  } catch {
    // ignore
  }
  return { title: 'Wedding Memories' };
}
