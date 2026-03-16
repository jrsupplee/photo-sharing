'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Event, Album, Media } from '@/types';
import MediaGrid from '@/components/MediaGrid';

interface GalleryClientProps {
  event: Event;
  albums: Album[];
  media: Media[];
  sessionId: string;
  currentAlbumId: number | null;
}

export default function GalleryClient({
  event,
  albums,
  media,
  sessionId,
  currentAlbumId,
}: GalleryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [allMedia, setAllMedia] = useState<Media[]>(media);
  const [activeAlbum, setActiveAlbum] = useState<number | null>(currentAlbumId);

  // Set session cookie on client
  useEffect(() => {
    if (!document.cookie.includes('session_id=')) {
      document.cookie = `session_id=${sessionId}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [sessionId]);

  const refreshMedia = useCallback(async () => {
    const albumParam = activeAlbum ? `?album=${activeAlbum}` : '';
    const res = await fetch(`/api/events/${event.slug}/media${albumParam.replace('?album=', '?album=')}`);
    if (res.ok) {
      // Reload page to get fresh data
      router.refresh();
    }
  }, [event.slug, activeAlbum, router]);

  useEffect(() => {
    setAllMedia(media);
  }, [media]);

  const handleAlbumChange = (albumId: number | null) => {
    setActiveAlbum(albumId);
    const params = new URLSearchParams(searchParams.toString());
    if (albumId) {
      params.set('album', albumId.toString());
    } else {
      params.delete('album');
    }
    router.push(`?${params.toString()}`);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-sm border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-stone-400 hover:text-stone-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="text-center">
            <h1 className="font-cormorant text-xl sm:text-2xl text-stone-700 tracking-wide">{event.name}</h1>
            {event.date_start && (
              <p className="text-stone-400 text-xs font-light tracking-widest mt-0.5">
                {formatDate(event.date_start)}
                {event.date_end && event.date_end !== event.date_start && (
                  <> — {formatDate(event.date_end)}</>
                )}
              </p>
            )}
          </div>
          <Link
            href={`/${event.slug}/upload`}
            className="flex items-center gap-1.5 text-stone-500 hover:text-stone-700 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline tracking-wider">Upload</span>
          </Link>
        </div>
      </header>

      {/* Album filter tabs */}
      {albums.length > 1 && (
        <div className="border-b border-stone-100 bg-white/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex gap-0 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => handleAlbumChange(null)}
                className={`px-4 py-3 text-sm font-light tracking-widest whitespace-nowrap border-b-2 transition-colors ${
                  activeAlbum === null
                    ? 'border-stone-700 text-stone-700'
                    : 'border-transparent text-stone-400 hover:text-stone-600'
                }`}
              >
                All
              </button>
              {albums.map(album => (
                <button
                  key={album.id}
                  onClick={() => handleAlbumChange(album.id)}
                  className={`px-4 py-3 text-sm font-light tracking-widest whitespace-nowrap border-b-2 transition-colors ${
                    activeAlbum === album.id
                      ? 'border-stone-700 text-stone-700'
                      : 'border-transparent text-stone-400 hover:text-stone-600'
                  }`}
                >
                  {album.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gallery */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-stone-400 text-sm font-light">
            {allMedia.length} {allMedia.length === 1 ? 'memory' : 'memories'}
          </p>
          <Link
            href={`/${event.slug}/upload`}
            className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white text-xs tracking-widest uppercase hover:bg-stone-700 transition-colors rounded-lg sm:hidden"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Share
          </Link>
        </div>
        <MediaGrid media={allMedia} sessionId={sessionId} />
      </main>

      {/* Floating upload button for desktop */}
      <Link
        href={`/${event.slug}/upload`}
        className="fixed bottom-8 right-8 hidden sm:flex items-center gap-2 px-6 py-3 bg-stone-800 text-white text-sm tracking-widest uppercase hover:bg-stone-700 transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Share a Memory
      </Link>
    </div>
  );
}
