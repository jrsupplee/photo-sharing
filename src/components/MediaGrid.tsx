'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Media } from '@/types';
import Lightbox from './Lightbox';

interface MediaGridProps {
  media: Media[];
  sessionId: string;
}

export default function MediaGrid({ media, sessionId }: MediaGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    const counts: Record<number, number> = {};
    media.forEach(m => {
      counts[m.id] = m.like_count || 0;
    });
    setLikeCounts(counts);
  }, [media]);

  const handleLike = async (e: React.MouseEvent, mediaId: number) => {
    e.stopPropagation();
    const res = await fetch(`/api/media/${mediaId}/likes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    });
    if (res.ok) {
      const data = await res.json();
      setLikeCounts(prev => ({ ...prev, [mediaId]: data.count }));
      setLikedIds(prev => {
        const next = new Set(prev);
        if (data.liked) next.add(mediaId);
        else next.delete(mediaId);
        return next;
      });
    }
  };

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-stone-400">
        <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="font-light italic">No photos yet. Be the first to share a memory.</p>
      </div>
    );
  }

  return (
    <>
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-2 sm:gap-3">
        {media.map((item, index) => {
          const isVideo = item.mime_type?.startsWith('video/');
          const isLiked = likedIds.has(item.id);
          const count = likeCounts[item.id] || 0;

          return (
            <div
              key={item.id}
              className="break-inside-avoid mb-2 sm:mb-3 relative group cursor-pointer overflow-hidden rounded-lg bg-stone-100"
              onClick={() => setLightboxIndex(index)}
            >
              {isVideo ? (
                <div className="relative aspect-video bg-stone-900 flex items-center justify-center">
                  <video
                    src={`/api/files/${item.storage_key}`}
                    className="w-full h-full object-cover opacity-70"
                    muted
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Image
                    src={`/api/files/${item.thumbnail_key ?? item.storage_key}`}
                    alt={item.caption || item.original_name}
                    width={400}
                    height={300}
                    className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  {item.caption && (
                    <p className="text-white text-xs font-light italic mb-1 line-clamp-2">{item.caption}</p>
                  )}
                  {item.uploader_name && (
                    <p className="text-white/70 text-xs">{item.uploader_name}</p>
                  )}
                </div>
              </div>

              {/* Like button */}
              <button
                onClick={(e) => handleLike(e, item.id)}
                className={`absolute top-2 right-2 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-1 text-xs transition-all duration-200 opacity-0 group-hover:opacity-100 ${isLiked ? 'text-rose-400' : 'text-white/80 hover:text-rose-400'}`}
              >
                <svg className="w-3 h-3" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {count > 0 && <span>{count}</span>}
              </button>

              {/* Album tag */}
              {item.album_name && (
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="bg-black/30 backdrop-blur-sm text-white/80 text-xs px-2 py-0.5 rounded-full">
                    {item.album_name}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          media={media}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          sessionId={sessionId}
        />
      )}
    </>
  );
}
