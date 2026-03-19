'use client';

import { useState } from 'react';
import { Media, Comment } from '@/types';

interface VideoModalProps {
  item: Media;
  sessionId: string;
  isAdmin?: boolean;
  isLiked: boolean;
  likeCount: number;
  commentCount: number;
  onLike: (count: number, liked: boolean) => void;
  onCommentAdded: (mediaId: number) => void;
  onClose: () => void;
  onDeleted: (id: number) => void;
  onUpdated: (item: Media) => void;
  onRestore?: (id: number) => void;
}

export default function VideoModal({
  item,
  sessionId,
  isAdmin,
  isLiked,
  likeCount,
  commentCount,
  onLike,
  onCommentAdded,
  onClose,
  onDeleted,
  onUpdated,
  onRestore,
}: VideoModalProps) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState({ author_name: '', body: '' });
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editFields, setEditFields] = useState({ uploader_name: item.uploader_name || '', caption: item.caption || '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const canEdit = isAdmin || item.session_id === sessionId;

  const fetchComments = async () => {
    const res = await fetch(`/api/media/${item.id}/comments`);
    if (res.ok) setComments(await res.json());
  };

  const handleShowComments = async () => {
    if (!showComments) await fetchComments();
    setShowComments(v => !v);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.author_name || !newComment.body) return;
    setSubmittingComment(true);
    const res = await fetch(`/api/media/${item.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newComment, session_id: sessionId }),
    });
    if (res.ok) {
      const comment = await res.json();
      setComments(prev => [...prev, comment]);
      onCommentAdded(item.id);
      setNewComment({ author_name: '', body: '' });
    }
    setSubmittingComment(false);
  };

  const handleLike = async () => {
    const res = await fetch(`/api/media/${item.id}/likes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    });
    if (res.ok) {
      const data = await res.json();
      onLike(data.count, data.liked);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this video? This cannot be undone.')) return;
    setDeleting(true);
    const res = await fetch(`/api/media/${item.id}?session_id=${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
    if (res.ok) onDeleted(item.id);
    setDeleting(false);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    const res = await fetch(`/api/media/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editFields, session_id: sessionId }),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdated(updated);
      setShowEdit(false);
    }
    setSavingEdit(false);
  };

  const handleRestore = async () => {
    setRestoring(true);
    const res = await fetch(`/api/media/${item.id}/restore`, { method: 'POST' });
    if (res.ok) onRestore?.(item.id);
    setRestoring(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.97)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)', flexShrink: 0 }}>
        <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
          {item.album_name && <>{item.album_name} · </>}
          {item.original_name}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', padding: '0.25rem' }}>
          <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Video */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '0 1rem' }}>
        <video
          key={item.id}
          src={`/api/files/${item.storage_key}`}
          poster={item.medium_key ? `/api/files/${item.medium_key}` : undefined}
          autoPlay
          controls
          playsInline
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      </div>

      {/* Action bar */}
      {showEdit ? (
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
      ) : showComments ? (
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
      ) : onRestore ? (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: '0.75rem 1.25rem', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button onClick={handleRestore} disabled={restoring} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, color: 'white', fontSize: '0.875rem', letterSpacing: '0.05em', padding: '0.5rem 1.5rem', cursor: 'pointer', opacity: restoring ? 0.5 : 1 }}>
            {restoring ? 'Restoring…' : 'Restore'}
          </button>
        </div>
      ) : (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2.5rem', background: 'rgba(0,0,0,0.7)', padding: '0.75rem 1.25rem', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button onClick={handleLike} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: isLiked ? '#fb7185' : 'rgba(255,255,255,0.7)' }}>
            <svg style={{ width: 28, height: 28 }} fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>{likeCount}</span>
          </button>
          <button onClick={handleShowComments} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}>
            <svg style={{ width: 28, height: 28 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>{commentCount}</span>
          </button>
          {canEdit && (
            <>
              <button onClick={() => setShowEdit(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}>
                <svg style={{ width: 28, height: 28 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button onClick={handleDelete} disabled={deleting} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(251,113,133,0.8)', opacity: deleting ? 0.5 : 1 }}>
                <svg style={{ width: 28, height: 28 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
