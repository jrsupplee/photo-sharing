'use client';

import { useState, useEffect } from 'react';
import { MasonryPhotoAlbum } from 'react-photo-album';
import 'react-photo-album/masonry.css';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import 'yet-another-react-lightbox/plugins/captions.css';
import { Media } from '@/types';
import { Comment } from '@/types';

interface MediaGridProps {
  media: Media[];
  sessionId: string;
  isAdmin?: boolean;
  onRestore?: (id: number) => void;
}

export default function MediaGrid({ media, sessionId, isAdmin, onRestore }: MediaGridProps) {
  const [mediaItems, setMediaItems] = useState<Media[]>(media);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<number>>(() => new Set(media.filter(m => m.user_liked).map(m => m.id)));
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>(() =>
    Object.fromEntries(media.map(m => [m.id, m.like_count || 0]))
  );
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<number, number>>(() =>
    Object.fromEntries(media.map(m => [m.id, m.comment_count || 0]))
  );
  const [newComment, setNewComment] = useState({ author_name: '', body: '' });
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editFields, setEditFields] = useState({ uploader_name: '', caption: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [videoMedia, setVideoMedia] = useState<Media | null>(null);

  useEffect(() => {
    setMediaItems(media);
  }, [media]);

  // If lightbox navigates to a video, switch to the video modal instead
  useEffect(() => {
    if (lightboxOpen && mediaItems[currentIndex]?.mime_type?.startsWith('video/')) {
      setLightboxOpen(false);
      setVideoMedia(mediaItems[currentIndex]);
      setShowComments(false);
      setShowEdit(false);
      setComments([]);
    }
  }, [currentIndex, lightboxOpen, mediaItems]);

  const currentMedia = lightboxOpen ? mediaItems[currentIndex] : videoMedia;

  const closeVideoModal = () => {
    setVideoMedia(null);
    setShowComments(false);
    setShowEdit(false);
    setComments([]);
  };

  const handleLike = async (mediaId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
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
        data.liked ? next.add(mediaId) : next.delete(mediaId);
        return next;
      });
    }
  };

  const fetchComments = async (mediaId: number) => {
    const res = await fetch(`/api/media/${mediaId}/comments`);
    if (res.ok) setComments(await res.json());
  };

  const handleShowComments = async () => {
    if (!currentMedia) return;
    if (!showComments) await fetchComments(currentMedia.id);
    setShowComments(v => !v);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMedia || !newComment.author_name || !newComment.body) return;
    setSubmittingComment(true);
    const res = await fetch(`/api/media/${currentMedia.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newComment, session_id: sessionId }),
    });
    if (res.ok) {
      const comment = await res.json();
      setComments(prev => [...prev, comment]);
      setCommentCounts(prev => ({ ...prev, [currentMedia.id]: (prev[currentMedia.id] || 0) + 1 }));
      setNewComment({ author_name: '', body: '' });
    }
    setSubmittingComment(false);
  };

  const handleDelete = async (mediaId: number) => {
    if (!confirm('Delete this photo? This cannot be undone.')) return;
    setDeletingId(mediaId);
    const res = await fetch(`/api/media/${mediaId}?session_id=${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
    if (res.ok) {
      setLightboxOpen(false);
      setVideoMedia(null);
      setMediaItems(prev => prev.filter(m => m.id !== mediaId));
    }
    setDeletingId(null);
  };

  const handleRestore = async (mediaId: number) => {
    setRestoringId(mediaId);
    const res = await fetch(`/api/media/${mediaId}/restore`, { method: 'POST' });
    if (res.ok) {
      setLightboxOpen(false);
      setVideoMedia(null);
      setMediaItems(prev => prev.filter(m => m.id !== mediaId));
      onRestore?.(mediaId);
    }
    setRestoringId(null);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMedia) return;
    setSavingEdit(true);
    const res = await fetch(`/api/media/${currentMedia.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editFields, session_id: sessionId }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMediaItems(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
      setShowEdit(false);
    }
    setSavingEdit(false);
  };

  const slides = mediaItems.map(item => ({
    src: `/api/files/${item.medium_key ?? item.storage_key}`,
    description: item.caption || '',
    width: 1200,
    height: 900,
  }));

  const photos = mediaItems.map((item, index) => ({
    src: `/api/files/${item.thumbnail_key ?? item.storage_key}`,
    width: 4,
    height: item.mime_type?.startsWith('video/') ? 3 : 4,
    key: String(item.id),
    index,
  }));

  if (mediaItems.length === 0) {
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
      <MasonryPhotoAlbum
        photos={photos}
        onClick={({ index }) => {
          const item = mediaItems[index];
          setCurrentIndex(index);
          setShowComments(false);
          setComments([]);
          if (item?.mime_type?.startsWith('video/')) {
            setVideoMedia(item);
          } else {
            setLightboxOpen(true);
          }
        }}
        spacing={8}
        columns={containerWidth => {
          if (containerWidth < 400) return 2;
          if (containerWidth < 800) return 3;
          return 4;
        }}
        render={{
          photo: ({ onClick }, { photo, index: photoIndex }) => {
            const item = mediaItems[(photo as typeof photos[0]).index ?? photoIndex];
            const isVideo = item.mime_type?.startsWith('video/');
            const isLiked = likedIds.has(item.id);
            const count = likeCounts[item.id] || 0;
            return (
              <div key={item.id} style={{ position: 'relative', overflow: 'hidden', borderRadius: 8, cursor: 'pointer', width: '100%' }} className="group bg-stone-100" onClick={onClick}>
                {isVideo ? (
                  <div className="relative w-full bg-stone-900 aspect-video flex items-center justify-center">
                    {item.medium_key ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/files/${item.medium_key}`} alt={item.caption || item.original_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-stone-800" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                    </div>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.src} alt={item.caption || item.original_name} style={{ display: 'block', width: '100%', height: 'auto' }} />
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    {item.caption && <p className="text-white text-xs font-light italic mb-0.5 line-clamp-2">{item.caption}</p>}
                    {item.uploader_name && <p className="text-white/70 text-xs">Uploaded by: {item.uploader_name}</p>}
                  </div>
                </div>

                {/* Like button */}
                <button
                  onClick={e => handleLike(item.id, e)}
                  className={`absolute top-2 right-2 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-all duration-200 ${isLiked ? 'text-rose-400' : 'text-white/80 hover:text-rose-400'}`}
                >
                  <svg style={{ width: 12, height: 12 }} fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {count > 0 && <span>{count}</span>}
                </button>

                {/* Album tag */}
                {item.album_name && (
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="bg-black/30 backdrop-blur-sm text-white/80 text-xs px-2 py-0.5 rounded-full">{item.album_name}</span>
                  </div>
                )}
              </div>
            );
          },
        }}
      />

      <Lightbox
        open={lightboxOpen}
        index={currentIndex}
        close={() => { setLightboxOpen(false); setShowComments(false); setShowEdit(false); }}
        slides={slides}
        on={{ view: ({ index }) => { setCurrentIndex(index); setShowComments(false); setShowEdit(false); setComments([]); } }}
        plugins={[Captions]}
        captions={{ showToggle: true, descriptionTextAlign: 'center' }}
        styles={{
          container: { backgroundColor: 'rgba(0,0,0,0.95)' },
          captionsTitle: { fontFamily: 'var(--font-lato, sans-serif)', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' },
          captionsDescription: { fontFamily: 'var(--font-lato, sans-serif)', fontSize: '0.9rem', fontStyle: 'italic', color: 'rgba(255,255,255,0.8)' },
        }}
        render={{
          controls: () => {
            if (!currentMedia) return null;
            const canEdit = isAdmin || currentMedia.session_id === sessionId;
            const topBar = (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem 1rem', background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)', pointerEvents: 'none' }}>
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                  {currentIndex + 1} / {mediaItems.length}
                  {currentMedia.album_name && <> · {currentMedia.album_name}</>}
                </span>
              </div>
            );
            if (showEdit) return (
              <>{topBar}<div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, paddingBottom: 'env(safe-area-inset-bottom)', background: '#171717', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem', fontWeight: 300, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Edit Photo</span>
                  <button onClick={() => setShowEdit(false)} style={{ color: 'rgba(255,255,255,0.4)', padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <form onSubmit={handleEditSave} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={editFields.uploader_name}
                    onChange={e => setEditFields(p => ({ ...p, uploader_name: e.target.value }))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <input
                    type="text"
                    placeholder="Caption"
                    value={editFields.caption}
                    onChange={e => setEditFields(p => ({ ...p, caption: e.target.value }))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button
                    type="submit"
                    disabled={savingEdit}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: 'white', fontSize: '0.875rem', padding: '0.5rem', cursor: 'pointer', opacity: savingEdit ? 0.5 : 1 }}
                  >
                    {savingEdit ? 'Saving…' : 'Save'}
                  </button>
                </form>
              </div></>
            );
            if (showComments) return (
              <>{topBar}<div
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, maxHeight: '60vh', paddingBottom: 'env(safe-area-inset-bottom)', background: '#171717', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem', fontWeight: 300, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Comments</span>
                  <button onClick={() => setShowComments(false)} style={{ color: 'rgba(255,255,255,0.4)', padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {comments.length === 0
                    ? <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem', fontStyle: 'italic' }}>No comments yet. Be the first!</p>
                    : comments.map(comment => (
                      <div key={comment.id}>
                        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: 500 }}>{comment.author_name}</div>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.6, margin: '0.125rem 0' }}>{comment.body}</p>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>{new Date(comment.created_at).toLocaleDateString()}</span>
                      </div>
                    ))
                  }
                </div>
                <form onSubmit={handleCommentSubmit} style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={newComment.author_name}
                    onChange={e => setNewComment(p => ({ ...p, author_name: e.target.value }))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                    required
                  />
                  <textarea
                    placeholder="Leave a message..."
                    value={newComment.body}
                    onChange={e => setNewComment(p => ({ ...p, body: e.target.value }))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.875rem', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                    rows={2}
                    required
                  />
                  <button
                    type="submit"
                    disabled={submittingComment}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: 'white', fontSize: '0.875rem', padding: '0.5rem', cursor: 'pointer', opacity: submittingComment ? 0.5 : 1 }}
                  >
                    {submittingComment ? 'Posting…' : 'Post Comment'}
                  </button>
                </form>
              </div></>
            );
            if (onRestore) return (
              <>{topBar}<div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: '0.75rem 1.25rem', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                <button
                  onClick={() => handleRestore(currentMedia.id)}
                  disabled={restoringId === currentMedia.id}
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, color: 'white', fontSize: '0.875rem', letterSpacing: '0.05em', padding: '0.5rem 1.5rem', cursor: 'pointer', opacity: restoringId === currentMedia.id ? 0.5 : 1 }}
                >
                  {restoringId === currentMedia.id ? 'Restoring…' : 'Restore'}
                </button>
              </div></>
            );
            return (
              <>{topBar}<div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2.5rem', background: 'rgba(0,0,0,0.7)', padding: '0.75rem 1.25rem', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                <button
                  onClick={() => handleLike(currentMedia.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: likedIds.has(currentMedia.id) ? '#fb7185' : 'rgba(255,255,255,0.7)' }}
                >
                  <svg style={{ width: 28, height: 28 }} fill={likedIds.has(currentMedia.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>{likeCounts[currentMedia.id] || 0}</span>
                </button>
                <button
                  onClick={handleShowComments}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}
                >
                  <svg style={{ width: 28, height: 28 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>{commentCounts[currentMedia.id] || 0}</span>
                </button>
                {canEdit && (
                  <>
                    <button
                      onClick={() => { setEditFields({ uploader_name: currentMedia.uploader_name || '', caption: currentMedia.caption || '' }); setShowEdit(true); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}
                    >
                      <svg style={{ width: 28, height: 28 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(currentMedia.id)}
                      disabled={deletingId === currentMedia.id}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(251,113,133,0.8)', opacity: deletingId === currentMedia.id ? 0.5 : 1 }}
                    >
                      <svg style={{ width: 28, height: 28 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div></>
            );
          }
        }}
      />

      {/* Video modal */}
      {videoMedia && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)', flexShrink: 0 }}>
            <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
              {mediaItems.indexOf(videoMedia) + 1} / {mediaItems.length}
              {videoMedia.album_name && <> · {videoMedia.album_name}</>}
            </span>
            <button onClick={closeVideoModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', padding: '0.25rem' }}>
              <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Video */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '0 1rem' }}>
            <video
              key={videoMedia.id}
              src={`/api/files/${videoMedia.storage_key}`}
              poster={videoMedia.medium_key ? `/api/files/${videoMedia.medium_key}` : undefined}
              autoPlay
              muted
              controls
              playsInline
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </div>

          {/* Action bar */}
          {(() => {
            const item = videoMedia;
            const canEdit = isAdmin || item.session_id === sessionId;
            if (showEdit) return (
              <div style={{ flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom)', background: '#171717', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem', fontWeight: 300, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Edit</span>
                  <button onClick={() => setShowEdit(false)} style={{ color: 'rgba(255,255,255,0.4)', padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <form onSubmit={handleEditSave} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input type="text" placeholder="Your name" value={editFields.uploader_name} onChange={e => setEditFields(p => ({ ...p, uploader_name: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                  <input type="text" placeholder="Caption" value={editFields.caption} onChange={e => setEditFields(p => ({ ...p, caption: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                  <button type="submit" disabled={savingEdit} style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: 'white', fontSize: '0.875rem', padding: '0.5rem', cursor: 'pointer', opacity: savingEdit ? 0.5 : 1 }}>{savingEdit ? 'Saving…' : 'Save'}</button>
                </form>
              </div>
            );
            if (showComments) return (
              <div style={{ flexShrink: 0, maxHeight: '60vh', paddingBottom: 'env(safe-area-inset-bottom)', background: '#171717', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem', fontWeight: 300, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Comments</span>
                  <button onClick={() => setShowComments(false)} style={{ color: 'rgba(255,255,255,0.4)', padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {comments.length === 0
                    ? <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem', fontStyle: 'italic' }}>No comments yet. Be the first!</p>
                    : comments.map(comment => (
                      <div key={comment.id}>
                        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: 500 }}>{comment.author_name}</div>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.6, margin: '0.125rem 0' }}>{comment.body}</p>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>{new Date(comment.created_at).toLocaleDateString()}</span>
                      </div>
                    ))
                  }
                </div>
                <form onSubmit={handleCommentSubmit} style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input type="text" placeholder="Your name" value={newComment.author_name} onChange={e => setNewComment(p => ({ ...p, author_name: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} required />
                  <textarea placeholder="Leave a message..." value={newComment.body} onChange={e => setNewComment(p => ({ ...p, body: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.875rem', outline: 'none', resize: 'none', boxSizing: 'border-box' }} rows={2} required />
                  <button type="submit" disabled={submittingComment} style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: 'white', fontSize: '0.875rem', padding: '0.5rem', cursor: 'pointer', opacity: submittingComment ? 0.5 : 1 }}>{submittingComment ? 'Posting…' : 'Post Comment'}</button>
                </form>
              </div>
            );
            if (onRestore) return (
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: '0.75rem 1.25rem', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                <button onClick={() => handleRestore(item.id)} disabled={restoringId === item.id} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, color: 'white', fontSize: '0.875rem', letterSpacing: '0.05em', padding: '0.5rem 1.5rem', cursor: 'pointer', opacity: restoringId === item.id ? 0.5 : 1 }}>
                  {restoringId === item.id ? 'Restoring…' : 'Restore'}
                </button>
              </div>
            );
            return (
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2.5rem', background: 'rgba(0,0,0,0.7)', padding: '0.75rem 1.25rem', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                <button onClick={() => handleLike(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: likedIds.has(item.id) ? '#fb7185' : 'rgba(255,255,255,0.7)' }}>
                  <svg style={{ width: 28, height: 28 }} fill={likedIds.has(item.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>{likeCounts[item.id] || 0}</span>
                </button>
                <button onClick={handleShowComments} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}>
                  <svg style={{ width: 28, height: 28 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>{commentCounts[item.id] || 0}</span>
                </button>
                {canEdit && (
                  <>
                    <button onClick={() => { setEditFields({ uploader_name: item.uploader_name || '', caption: item.caption || '' }); setShowEdit(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}>
                      <svg style={{ width: 28, height: 28 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(251,113,133,0.8)', opacity: deletingId === item.id ? 0.5 : 1 }}>
                      <svg style={{ width: 28, height: 28 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </>
  );
}
