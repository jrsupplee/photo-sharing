import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/getSession';
import { eventRepo } from '@/lib/repositories';
import SignOutButton from '../SignOutButton';
import BackfillVariants from './BackfillVariants';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/admin');

  const events = eventRepo.listWithCounts();

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-stone-100 bg-white/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-cormorant text-2xl text-stone-700">Admin Dashboard</h1>
            <p className="text-stone-400 text-xs font-light">Wedding Memories</p>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <BackfillVariants />
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-cormorant text-3xl text-stone-700">Events</h2>
          <Link
            href="/admin/events/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-stone-800 text-white text-sm tracking-wider hover:bg-stone-700 transition-colors rounded-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Event
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-20 text-stone-400">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="font-light italic">No events yet. Create your first wedding event.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {events.map(event => (
              <div key={event.id} className="bg-white rounded-xl border border-stone-100 p-6 hover:border-stone-200 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-cormorant text-2xl text-stone-700">{event.name}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-stone-400 font-light">
                      {event.date_start && (
                        <span>{new Date(event.date_start).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      )}
                      <span className="text-stone-300">·</span>
                      <span>{event.media_count} photos</span>
                      <span className="text-stone-300">·</span>
                      <span>{event.album_count} albums</span>
                    </div>
                    <div className="mt-2">
                      <code className="text-xs text-stone-400 bg-stone-50 px-2 py-0.5 rounded">/{event.slug}</code>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/${event.slug}`}
                      className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
                      title="View gallery"
                      target="_blank"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                    <Link
                      href={`/admin/events/${event.id}`}
                      className="px-4 py-2 text-sm text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
