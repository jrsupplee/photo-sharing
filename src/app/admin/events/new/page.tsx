import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/getSession';
import NewEventForm from './NewEventForm';

export default async function NewEventPage() {
  const session = await getSession();
  if (!session) redirect('/admin/login');

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-stone-100 bg-white/50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/admin/dashboard"
            className="text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </Link>
          <h1 className="font-cormorant text-xl text-stone-700">New Event</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-10">
          <div className="w-12 h-px bg-stone-300 mx-auto mb-6" />
          <h2 className="font-cormorant text-4xl font-light text-stone-700 mb-3">Create Event</h2>
          <p className="text-stone-400 font-light text-sm">Set up a new photo sharing event</p>
          <div className="w-12 h-px bg-stone-300 mx-auto mt-6" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 sm:p-8">
          <NewEventForm />
        </div>
      </main>
    </div>
  );
}
