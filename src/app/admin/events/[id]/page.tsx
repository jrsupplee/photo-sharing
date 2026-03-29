import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/getSession';
import { eventTable, albumTable, qrScanTable } from '@/lib/tables';
import EventManageClient from './EventManageClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ManageEventPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect('/admin/login');

  const { id } = await params;

  const event = await eventTable.findById(id);
  if (!event) notFound();

  const [albums, qrScanCount] = await Promise.all([
    albumTable.findByEventId(event.id),
    qrScanTable.countByEventId(event.id),
  ]);
  const isAdmin = session.user.role === 'admin';
  const origin = process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? '';

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

      <EventManageClient event={event} albums={albums} isAdmin={isAdmin} qrScanCount={qrScanCount} origin={origin} />
    </div>
  );
}
