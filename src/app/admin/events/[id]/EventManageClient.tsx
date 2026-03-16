'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Event, Album, Media } from '@/types';

interface Props {
  event: Event;
  albums: Album[];
  media: Media[];
}

export default function EventManageClient({ event, albums: initialAlbums, media }: Props) {
  const router = useRouter();
  const [name, setName] = useState(event.name);
  const [dateStart, setDateStart] = useState(event.date_start || '');
  const [dateEnd, setDateEnd] = useState(event.date_end || '');
  const [albums, setAlbums] = useState<string[]>(initialAlbums.map(a => a.name));
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'media'>('settings');

  const addAlbum = () => setAlbums(prev => [...prev, '']);
  const updateAlbum = (i: number, v: string) => setAlbums(prev => prev.map((a, idx) => idx === i ? v : a));
  const removeAlbum = (i: number) => setAlbums(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/events/${event.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        date_start: dateStart || null,
        date_end: dateEnd || null,
        albums: albums.filter(a => a.trim()),
      }),
    });
    if (res.ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      router.refresh();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/events/${event.id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/admin/dashboard');
      router.refresh();
    } else {
      setDeleting(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Event title */}
      <div className="mb-8">
        <h2 className="font-cormorant text-3xl text-stone-700">{event.name}</h2>
        <code className="text-xs text-stone-400">/{event.slug}</code>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 mb-8">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-3 text-sm tracking-wider border-b-2 transition-colors -mb-px ${
            activeTab === 'settings'
              ? 'border-stone-700 text-stone-700'
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          Settings
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className={`px-6 py-3 text-sm tracking-wider border-b-2 transition-colors -mb-px flex items-center gap-2 ${
            activeTab === 'media'
              ? 'border-stone-700 text-stone-700'
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          Media
          <span className="bg-stone-100 text-stone-500 text-xs px-1.5 py-0.5 rounded-full">{media.length}</span>
        </button>
      </div>

      {activeTab === 'settings' && (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSave} className="bg-white rounded-xl border border-stone-100 p-6 space-y-5">
              <div>
                <label className="block text-xs tracking-widest text-stone-400 uppercase mb-1.5">Event Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-stone-700 focus:outline-none focus:border-stone-400 transition-colors text-sm"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-widest text-stone-400 uppercase mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={dateStart}
                    onChange={e => setDateStart(e.target.value)}
                    className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-stone-700 focus:outline-none focus:border-stone-400 transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-widest text-stone-400 uppercase mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={e => setDateEnd(e.target.value)}
                    className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-stone-700 focus:outline-none focus:border-stone-400 transition-colors text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs tracking-widest text-stone-400 uppercase">Albums</label>
                  <button type="button" onClick={addAlbum} className="text-xs text-stone-500 hover:text-stone-700 transition-colors flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {albums.map((album, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={album}
                        onChange={e => updateAlbum(index, e.target.value)}
                        placeholder={`Album ${index + 1}`}
                        className="flex-1 border border-stone-200 rounded-lg px-4 py-2 text-stone-700 focus:outline-none focus:border-stone-400 transition-colors text-sm"
                      />
                      <button type="button" onClick={() => removeAlbum(index)} className="p-2 text-stone-300 hover:text-rose-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-stone-800 text-white text-sm tracking-wider hover:bg-stone-700 transition-colors disabled:opacity-50 rounded-lg"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                {saveSuccess && (
                  <span className="text-sage text-sm flex items-center gap-1 text-green-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved!
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Danger zone */}
          <div>
            <div className="bg-white rounded-xl border border-rose-100 p-6">
              <h3 className="text-sm font-medium text-rose-700 mb-2">Danger Zone</h3>
              <p className="text-xs text-stone-400 mb-4 font-light">Deleting this event will permanently remove all photos, videos, and data associated with it.</p>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2 border border-rose-200 text-rose-500 text-sm rounded-lg hover:bg-rose-50 transition-colors"
                >
                  Delete Event
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-stone-600 font-medium">Are you absolutely sure?</p>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full py-2 bg-rose-500 text-white text-sm rounded-lg hover:bg-rose-600 transition-colors disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete Everything'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="w-full py-2 text-stone-400 text-sm hover:text-stone-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'media' && (
        <div>
          {media.length === 0 ? (
            <div className="text-center py-20 text-stone-400">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="font-light italic">No media uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {media.map(item => (
                <MediaCard key={item.id} item={item} onDelete={() => router.refresh()} />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function MediaCard({ item, onDelete }: { item: Media; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const isVideo = item.mime_type?.startsWith('video/');

  const handleDelete = async () => {
    if (!confirm('Delete this photo?')) return;
    setDeleting(true);
    const res = await fetch(`/api/media/${item.id}`, { method: 'DELETE' });
    if (res.ok) onDelete();
    else setDeleting(false);
  };

  return (
    <div className={`relative group rounded-lg overflow-hidden bg-stone-100 aspect-square ${deleting ? 'opacity-50' : ''}`}>
      {isVideo ? (
        <div className="w-full h-full flex items-center justify-center bg-stone-200">
          <svg className="w-8 h-8 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.867v6.266a1 1 0 01-1.447.902L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
      ) : (
        <Image
          src={`/api/files/${item.storage_key}`}
          alt={item.original_name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, 20vw"
        />
      )}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
        <div className="text-white text-xs text-center px-2">
          {item.uploader_name && <p>{item.uploader_name}</p>}
          <p className="text-white/60">{item.like_count} ♥ · {item.comment_count} comments</p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-3 py-1 bg-rose-500/90 text-white text-xs rounded hover:bg-rose-600 transition-colors"
        >
          Delete
        </button>
      </div>
      {item.album_name && (
        <div className="absolute bottom-1 left-1">
          <span className="bg-black/40 text-white text-xs px-1.5 py-0.5 rounded">{item.album_name}</span>
        </div>
      )}
    </div>
  );
}
