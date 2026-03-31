'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  refreshInterval?: number | null;
}

export default function GalleryClient({
  event,
  albums,
  media,
  sessionId,
  isAdmin,
  deletedMedia: initialDeletedMedia = [],
  refreshInterval,
}: GalleryClientProps) {
  const [allMedia, setAllMedia] = useState<Media[]>(media);
  const [activeAlbum, setActiveAlbum] = useState<number | null>(null);
  const [activeUploader, setActiveUploader] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedItems, setDeletedItems] = useState<Media[]>(initialDeletedMedia);

  useEffect(() => {
    setAllMedia(media);
  }, [media]);

  const router = useRouter();
  useEffect(() => {
    if (!refreshInterval) return;
    const id = setInterval(() => router.refresh(), refreshInterval);
    return () => clearInterval(id);
  }, [refreshInterval, router]);

  const handleAlbumChange = (albumId: number | null) => {
    setActiveAlbum(albumId);
    setShowDeleted(false);
  };

  const uploaderNames = Array.from(
    new Set(allMedia.map(m => m.uploader_name).filter((n): n is string => !!n))
  ).sort();

  const uploaderFilteredMedia = activeUploader
    ? allMedia.filter(m => m.uploader_name === activeUploader)
    : allMedia;

  const displayedMedia = activeAlbum
    ? uploaderFilteredMedia.filter(m => m.album_id === activeAlbum)
    : uploaderFilteredMedia;

  const albumCounts = uploaderFilteredMedia.reduce<Record<number, number>>((acc, m) => {
    if (m.album_id) acc[m.album_id] = (acc[m.album_id] || 0) + 1;
    return acc;
  }, {});

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
            <div className="flex items-center justify-center gap-2.5">
              {event.avatar_key && (
                <img
                  src={`/api/files/${event.avatar_key}`}
                  alt=""
                  className="w-11 h-11 rounded-full object-cover border border-stone-100 shadow-sm shrink-0"
                />
              )}
              <h1 className="font-cormorant text-xl sm:text-2xl text-stone-700 tracking-wide">{event.name}</h1>
            </div>
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
            {(() => {
              const activeAlbumObj = activeAlbum ? albums.find(a => a.id === activeAlbum) : null;
              const today = new Date().toISOString().split('T')[0];
              const uploadBlocked = !isAdmin && (
                !!activeAlbumObj?.read_only ||
                (!!activeAlbumObj?.available_from && today < activeAlbumObj.available_from)
              );
              const uploadBlockedTitle = activeAlbumObj?.read_only ? 'This album is read-only' : 'This album is not yet open for uploads';
              return uploadBlocked ? (
                <span
                  className="flex items-center gap-1.5 text-stone-300 text-sm cursor-not-allowed"
                  title={uploadBlockedTitle}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline tracking-wider">Upload</span>
                </span>
              ) : (
                <Link
                  href={`/${event.slug}/upload`}
                  className="flex items-center gap-1.5 text-stone-500 hover:text-stone-700 transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline tracking-wider">Upload</span>
                </Link>
              );
            })()}
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
                      className={`px-4 py-3 text-sm font-light tracking-widest whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
                        activeAlbum === album.id && !showDeleted
                          ? 'border-stone-700 text-stone-700'
                          : 'border-transparent text-stone-400 hover:text-stone-600'
                      }`}
                    >
                      {album.name}
                      {isAdmin && !!album.hidden && (
                        <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Hidden from guests">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                      {albumCounts[album.id] != null && (
                        <span className="bg-stone-100 text-stone-400 text-xs px-1.5 py-0.5 rounded-full">{albumCounts[album.id]}</span>
                      )}
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
              <div className="flex items-center gap-4">
                <p className="text-stone-400 text-sm font-light">
                  {displayedMedia.length} {displayedMedia.length === 1 ? 'memory' : 'memories'}
                </p>
                {uploaderNames.length >= 1 && (
                  <select
                    value={activeUploader ?? ''}
                    onChange={e => setActiveUploader(e.target.value || null)}
                    className="text-sm font-light text-stone-500 bg-transparent border border-stone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-stone-400 cursor-pointer"
                  >
                    <option value="">All uploaders</option>
                    {uploaderNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                )}
              </div>
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
            <MediaGrid media={displayedMedia} sessionId={sessionId} isAdmin={isAdmin} albums={isAdmin ? albums : undefined} />
          </>
        )}
      </main>

      {/* Floating upload button for desktop */}
      {(() => {
        const activeAlbumObj = activeAlbum ? albums.find(a => a.id === activeAlbum) : null;
        const today = new Date().toISOString().split('T')[0];
        const uploadBlocked = !isAdmin && (
          !!activeAlbumObj?.read_only ||
          (!!activeAlbumObj?.available_from && today < activeAlbumObj.available_from)
        );
        return uploadBlocked ? null : (
          <Link
            href={`/${event.slug}/upload`}
            className="fixed bottom-8 right-8 hidden sm:flex items-center gap-2 px-6 py-3 bg-stone-800 text-white text-sm tracking-widest uppercase hover:bg-stone-700 transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Share a Memory
          </Link>
        );
      })()}
    </div>
  );
}

