import { notFound } from 'next/navigation';
import Link from 'next/link';
import { eventTable, albumTable } from '@/lib/tables';
import UploadForm from '@/components/UploadForm';

interface Props {
  params: Promise<{ eventSlug: string }>;
}

export default async function UploadPage({ params }: Props) {
  const { eventSlug } = await params;

  const event = eventTable.findBySlug(eventSlug);
  if (!event) notFound();

  const albums = albumTable.findByEventId(event.id);

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="border-b border-stone-100 bg-white/50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href={`/${eventSlug}`}
            className="text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Back to Gallery</span>
          </Link>
          <div className="text-center">
            <p className="text-stone-400 text-xs tracking-widest uppercase font-light">{event.name}</p>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 sm:px-6 py-6">
        <div className="text-center mb-6">
          <h1 className="font-cormorant text-4xl font-light text-stone-700 mb-1">Share a Memory</h1>
          <p className="text-stone-400 font-light text-sm">Upload your photos and videos from the celebration</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 sm:p-8">
          <UploadForm eventSlug={eventSlug} albums={albums} defaultAlbumId={event.default_album_id} />
        </div>
      </main>
    </div>
  );
}
