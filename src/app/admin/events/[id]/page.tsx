import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/getSession';
import getDb from '@/lib/db';
import { Event, Album, Media } from '@/types';
import EventManageClient from './EventManageClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ManageEventPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect('/admin');

  const { id } = await params;
  const db = getDb();

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as Event | undefined;
  if (!event) notFound();

  const albums = db.prepare('SELECT * FROM albums WHERE event_id = ? ORDER BY "order" ASC').all(event.id) as Album[];

  const media = db.prepare(`
    SELECT m.*, a.name as album_name,
      (SELECT COUNT(*) FROM likes l WHERE l.media_id = m.id) as like_count,
      (SELECT COUNT(*) FROM comments c WHERE c.media_id = m.id) as comment_count
    FROM media m
    LEFT JOIN albums a ON m.album_id = a.id
    WHERE m.event_id = ?
    ORDER BY m.created_at DESC
  `).all(event.id) as Media[];

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-stone-100 bg-white/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/admin/dashboard"
            className="text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </Link>
          <h1 className="font-cormorant text-xl text-stone-700">Manage Event</h1>
          <Link
            href={`/${event.slug}`}
            target="_blank"
            className="text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-1 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className="hidden sm:inline">View Gallery</span>
          </Link>
        </div>
      </header>

      <EventManageClient event={event} albums={albums} media={media} />
    </div>
  );
}
