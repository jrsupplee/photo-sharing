'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Event, Album, Media } from '@/types';
import MediaGrid from '@/components/MediaGrid';

interface GalleryClientProps {
  event: Event;
  albums: Album[];
  media: Media[];
  sessionId: string;
  isAdmin?: boolean;
  deletedMedia?: Media[];
}

export default function GalleryClient({
  event,
  albums,
  media,
  sessionId,
  isAdmin,
  deletedMedia: initialDeletedMedia = [],
}: GalleryClientProps) {
  const [allMedia, setAllMedia] = useState<Media[]>(media);
  const [activeAlbum, setActiveAlbum] = useState<number | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedItems, setDeletedItems] = useState<Media[]>(initialDeletedMedia);

  // Set session cookie on client
  useEffect(() => {
    if (!document.cookie.includes('session_id=')) {
      document.cookie = `session_id=${sessionId}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [sessionId]);

  useEffect(() => {
    setAllMedia(media);
  }, [media]);

  const handleAlbumChange = (albumId: number | null) => {
    setActiveAlbum(albumId);
    setShowDeleted(false);
  };

  const displayedMedia = activeAlbum ? allMedia.filter(m => m.album_id === activeAlbum) : allMedia;

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
          <div />
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
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                href={`/admin/events/${event.id}`}
                className="flex items-center gap-1.5 text-stone-400 hover:text-stone-600 transition-colors text-sm"
                title="Manage event"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline tracking-wider">Admin</span>
              </Link>
            )}
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
        </div>
      </header>

      {/* Album filter tabs */}
      {(albums.length > 1 || isAdmin) && (
        <div className="border-b border-stone-100 bg-white/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex gap-0 overflow-x-auto scrollbar-hide">
              {albums.length > 1 && (
                <>
                  <button
                    onClick={() => handleAlbumChange(null)}
                    className={`px-4 py-3 text-sm font-light tracking-widest whitespace-nowrap border-b-2 transition-colors ${
                      activeAlbum === null && !showDeleted
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
                        activeAlbum === album.id && !showDeleted
                          ? 'border-stone-700 text-stone-700'
                          : 'border-transparent text-stone-400 hover:text-stone-600'
                      }`}
                    >
                      {album.name}
                    </button>
                  ))}
                </>
              )}
              {isAdmin && (
                <button
                  onClick={() => { setShowDeleted(true); setActiveAlbum(null); }}
                  className={`px-4 py-3 text-sm font-light tracking-widest whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
                    showDeleted
                      ? 'border-stone-700 text-stone-700'
                      : 'border-transparent text-stone-400 hover:text-stone-600'
                  }`}
                >
                  Deleted
                  {deletedItems.length > 0 && (
                    <span className="bg-rose-100 text-rose-500 text-xs px-1.5 py-0.5 rounded-full">{deletedItems.length}</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gallery */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-8">
        {showDeleted ? (
          <>
            <p className="text-stone-400 text-sm font-light mb-6">
              {deletedItems.length} deleted {deletedItems.length === 1 ? 'item' : 'items'}
            </p>
            {deletedItems.length === 0 ? (
              <div className="text-center py-20 text-stone-400">
                <p className="font-light italic">No deleted media.</p>
              </div>
            ) : (
              <MediaGrid
                media={deletedItems}
                sessionId={sessionId}
                onRestore={(id) => setDeletedItems(prev => prev.filter(m => m.id !== id))}
              />
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-stone-400 text-sm font-light">
                {displayedMedia.length} {displayedMedia.length === 1 ? 'memory' : 'memories'}
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
            <MediaGrid media={displayedMedia} sessionId={sessionId} isAdmin={isAdmin} />
          </>
        )}
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

