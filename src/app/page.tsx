import { redirect } from 'next/navigation';
import Link from 'next/link';
import getDb from '@/lib/db';
import { Event } from '@/types';

export default function Home() {
  let events: Event[] = [];
  try {
    const db = getDb();
    events = db.prepare('SELECT * FROM events ORDER BY date_start ASC').all() as Event[];
  } catch {
    // DB not yet initialized
  }

  if (events.length === 1) {
    redirect(`/${events[0].slug}`);
  }

  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-xl">
        <div className="mb-8">
          <div className="w-16 h-px bg-gold mx-auto mb-6" />
          <h1 className="font-cormorant text-5xl sm:text-6xl font-light text-stone-700 mb-4 tracking-wide">
            Wedding Memories
          </h1>
          <p className="text-stone-400 font-light tracking-widest text-xs uppercase">Share & Relive Beautiful Moments</p>
          <div className="w-16 h-px bg-gold mx-auto mt-6" />
        </div>

        {events.length === 0 ? (
          <div className="space-y-4">
            <p className="text-stone-500 font-light italic">No events yet.</p>
            <Link
              href="/admin"
              className="inline-block px-8 py-3 border border-stone-300 text-stone-600 text-sm tracking-widest uppercase hover:bg-stone-100 transition-colors"
            >
              Admin Login
            </Link>
          </div>
        ) : (
          <div className="space-y-4 mt-8">
            <p className="text-stone-500 font-light text-sm tracking-wider mb-6">Select an event to view photos</p>
            {events.map(event => (
              <Link
                key={event.id}
                href={`/${event.slug}`}
                className="block group"
              >
                <div className="border border-stone-200 rounded-xl p-6 hover:border-stone-300 hover:bg-white transition-all duration-300 text-left">
                  <h2 className="font-cormorant text-2xl text-stone-700 group-hover:text-stone-900 transition-colors">
                    {event.name}
                  </h2>
                  {event.date_start && (
                    <p className="text-stone-400 text-sm mt-1 font-light">
                      {new Date(event.date_start).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {event.date_end && event.date_end !== event.date_start && (
                        <> – {new Date(event.date_end).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}</>
                      )}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
