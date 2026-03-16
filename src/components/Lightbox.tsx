'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import Image from 'next/image';
import { Media, Comment } from '@/types';

interface LightboxProps {
  media: Media[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  sessionId: string;
}

export default function Lightbox({ media, currentIndex, onClose, onNavigate, sessionId }: LightboxProps) {
  const current = media[currentIndex];
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState({ author_name: '', body: '' });
  const [likeCount, setLikeCount] = useState(current?.like_count || 0);
  const [liked, setLiked] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [offsetX, setOffsetX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const swipeNavigating = useRef(false);

  const isVideo = current?.mime_type?.startsWith('video/');

  useEffect(() => {
    if (current) {
      setLiked(false);
      setLikeCount(current.like_count || 0);
      if (swipeNavigating.current) {
        swipeNavigating.current = false;
      } else {
        setImageLoading(true);
      }
      fetchLikeStatus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const fetchLikeStatus = async () => {
    if (!current) return;
    const res = await fetch(`/api/media/${current.id}/likes?session_id=${sessionId}`);
    if (res.ok) {
      const data = await res.json();
      setLikeCount(data.count);
      setLiked(data.liked);
    }
  };

  const fetchComments = async () => {
    if (!current) return;
    const res = await fetch(`/api/media/${current.id}/comments`);
    if (res.ok) {
      const data = await res.json();
      setComments(data);
    }
  };

  const handleShowComments = () => {
    if (!showComments) {
      fetchComments();
    }
    setShowComments(!showComments);
  };

  const handleLike = async () => {
    if (!current) return;
    const res = await fetch(`/api/media/${current.id}/likes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    });
    if (res.ok) {
      const data = await res.json();
      setLikeCount(data.count);
      setLiked(data.liked);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !newComment.author_name || !newComment.body) return;

    setSubmittingComment(true);
    const res = await fetch(`/api/media/${current.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newComment),
    });
    if (res.ok) {
      const comment = await res.json();
      setComments(prev => [...prev, comment]);
      setNewComment({ author_name: '', body: '' });
    }
    setSubmittingComment(false);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
    if (e.key === 'ArrowRight' && currentIndex < media.length - 1) onNavigate(currentIndex + 1);
  }, [currentIndex, media.length, onClose, onNavigate]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex" onClick={onClose}>
      {/* Close button — outside all swipe/overflow containers */}
      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        onTouchEnd={e => { e.stopPropagation(); e.preventDefault(); onClose(); }}
        className="absolute top-4 right-4 z-50 text-white/70 hover:text-white transition-colors bg-black/30 rounded-full p-2"
        style={{ touchAction: 'none' }}
      >
        <svg style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Main content */}
      <div
        className="flex-1 flex flex-col relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Image area — swipeable, fills available space */}
        <div
          className="relative flex-1 min-h-0 overflow-hidden"
          onTouchStart={e => {
            touchStartX.current = e.touches[0].clientX;
            setIsAnimating(false);
          }}
          onTouchMove={e => {
            if (touchStartX.current === null) return;
            setOffsetX(e.touches[0].clientX - touchStartX.current);
          }}
          onTouchEnd={e => {
            if (touchStartX.current === null) return;
            const diff = e.changedTouches[0].clientX - touchStartX.current;
            touchStartX.current = null;
            const w = window.innerWidth;
            setIsAnimating(true);
            if (diff < -80 && currentIndex < media.length - 1) {
              setOffsetX(-w);
              setTimeout(() => { swipeNavigating.current = true; onNavigate(currentIndex + 1); setOffsetX(0); setIsAnimating(false); }, 300);
            } else if (diff > 80 && currentIndex > 0) {
              setOffsetX(w);
              setTimeout(() => { swipeNavigating.current = true; onNavigate(currentIndex - 1); setOffsetX(0); setIsAnimating(false); }, 300);
            } else {
              setOffsetX(0);
              setTimeout(() => setIsAnimating(false), 300);
            }
          }}
        >
          {/* Navigation arrows */}
          {currentIndex > 0 && (
            <button
              onTouchEnd={e => { e.stopPropagation(); e.preventDefault(); onNavigate(currentIndex - 1); }}
              onClick={() => onNavigate(currentIndex - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white/70 hover:text-white transition-colors bg-black/30 rounded-full p-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {currentIndex < media.length - 1 && (
            <button
              onTouchEnd={e => { e.stopPropagation(); e.preventDefault(); onNavigate(currentIndex + 1); }}
              onClick={() => onNavigate(currentIndex + 1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white/70 hover:text-white transition-colors bg-black/30 rounded-full p-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Loading spinner */}
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <svg className="w-10 h-10 text-white/40 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
          )}

          {/* Current image */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: `translateX(${offsetX}px)`, transition: isAnimating ? 'transform 0.3s ease-out' : 'none' }}
          >
            {isVideo ? (
              <video
                src={`/api/files/${current.storage_key}`}
                controls
                className="max-h-full max-w-full rounded-lg"
                onLoadedData={() => setImageLoading(false)}
              />
            ) : (
              <div className="relative w-full h-full">
                <Image
                  src={`/api/files/${current.medium_key ?? current.storage_key}`}
                  alt={current.caption || current.original_name}
                  fill
                  className={`object-contain transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                  sizes="100vw"
                  onLoad={() => setImageLoading(false)}
                />
              </div>
            )}
          </div>

          {/* Adjacent image (shown during swipe) */}
          {offsetX !== 0 && (() => {
            const adjIndex = offsetX < 0 ? currentIndex + 1 : currentIndex - 1;
            const adjMedia = adjIndex >= 0 && adjIndex < media.length ? media[adjIndex] : null;
            if (!adjMedia) return null;
            const adjOffset = offsetX < 0 ? offsetX + window.innerWidth : offsetX - window.innerWidth;
            return (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ transform: `translateX(${adjOffset}px)`, transition: isAnimating ? 'transform 0.3s ease-out' : 'none' }}
              >
                {adjMedia.mime_type?.startsWith('video/') ? (
                  <video src={`/api/files/${adjMedia.storage_key}`} className="max-h-full max-w-full" />
                ) : (
                  <div className="relative w-full h-full">
                    <Image
                      src={`/api/files/${adjMedia.medium_key ?? adjMedia.storage_key}`}
                      alt={adjMedia.caption || adjMedia.original_name}
                      fill
                      className="object-contain"
                      sizes="100vw"
                    />
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Info bar — always visible below the image */}
        <div
          className="flex items-center gap-4 px-5 pt-3 bg-black/80"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex-1 min-w-0">
            {current.caption && (
              <p className="text-white text-sm italic font-light leading-snug truncate">&ldquo;{current.caption}&rdquo;</p>
            )}
            {current.uploader_name && (
              <p className="text-white/50 text-xs mt-0.5">{current.uploader_name}</p>
            )}
          </div>
          <div className="flex items-center shrink-0" style={{ gap: '2.5rem' }}>
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 transition-colors ${liked ? 'text-rose-400' : 'text-white/70 hover:text-rose-400'}`}
            >
              <svg style={{ width: 28, height: 28 }} fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-sm text-white/70">{likeCount}</span>
            </button>
            <button
              onClick={handleShowComments}
              className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
            >
              <svg style={{ width: 28, height: 28 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-sm text-white/70">{comments.length || current.comment_count || 0}</span>
            </button>
            <span className="text-white/40 text-sm">{currentIndex + 1} / {media.length}</span>
          </div>
        </div>
      </div>

      {/* Comments panel */}
      {showComments && (
        <div
          className="w-80 bg-neutral-900 border-l border-white/10 flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-white font-light text-sm tracking-widest uppercase">Comments</h3>
            <button onClick={() => setShowComments(false)} className="text-white/40 hover:text-white">
              <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {comments.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-4 italic">No comments yet. Be the first!</p>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="space-y-1">
                  <span className="text-white/80 text-xs font-medium">{comment.author_name}</span>
                  <p className="text-white/60 text-sm leading-relaxed">{comment.body}</p>
                  <span className="text-white/30 text-xs">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleCommentSubmit} className="p-4 border-t border-white/10 space-y-3">
            <input
              type="text"
              placeholder="Your name"
              value={newComment.author_name}
              onChange={e => setNewComment(p => ({ ...p, author_name: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/30"
              required
            />
            <textarea
              placeholder="Leave a message..."
              value={newComment.body}
              onChange={e => setNewComment(p => ({ ...p, body: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
              rows={3}
              required
            />
            <button
              type="submit"
              disabled={submittingComment}
              className="w-full bg-white/10 hover:bg-white/20 text-white text-sm py-2 rounded transition-colors disabled:opacity-50"
            >
              {submittingComment ? 'Posting...' : 'Post Comment'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
