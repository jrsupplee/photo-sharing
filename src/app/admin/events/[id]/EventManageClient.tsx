'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Event, Album } from '@/types';
import Link from 'next/link';

interface Props {
  event: Event;
  albums: Album[];
  isAdmin: boolean;
}

export default function EventManageClient({ event, albums: initialAlbums, isAdmin }: Props) {
  const router = useRouter();
  const [name, setName] = useState(event.name);
  const [dateStart, setDateStart] = useState(event.date_start || '');
  const [dateEnd, setDateEnd] = useState(event.date_end || '');
  const [requireName, setRequireName] = useState(!!event.require_name);
  const [albums, setAlbums] = useState<{ id: number; name: string }[]>(initialAlbums.map(a => ({ id: a.id, name: a.name })));
  const [defaultAlbumName, setDefaultAlbumName] = useState<string>(
    initialAlbums.find(a => a.id === event.default_album_id)?.name ?? ''
  );
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'albums' | 'download' | 'delete'>('general');
  const [downloadAlbumId, setDownloadAlbumId] = useState<string>('');

  const addAlbum = () => setAlbums(prev => [...prev, { id: 0, name: '' }]);
  const updateAlbum = (i: number, v: string) => {
    if (albums[i].name === defaultAlbumName) setDefaultAlbumName(v);
    setAlbums(prev => prev.map((a, idx) => idx === i ? { ...a, name: v } : a));
  };
  const removeAlbum = (i: number) => {
    if (albums[i].name === defaultAlbumName) setDefaultAlbumName('');
    setAlbums(prev => prev.filter((_, idx) => idx !== i));
  };
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const onDragStart = (i: number) => { dragIndex.current = i; };
  const onDragEnter = (i: number) => { setDragOver(i); };
  const onDrop = (i: number) => {
    const from = dragIndex.current;
    if (from === null || from === i) { setDragOver(null); return; }
    setAlbums(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(i, 0, item);
      return next;
    });
    dragIndex.current = null;
    setDragOver(null);
  };
  const onDragEnd = () => { dragIndex.current = null; setDragOver(null); };

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
        albums: albums.filter(a => a.name.trim()).map((a, i) => ({ id: a.id, name: a.name.trim(), order: i })),
        default_album_name: defaultAlbumName || null,
        require_name: requireName,
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

  const tabClass = (tab: typeof activeTab) =>
    `px-6 py-3 text-sm tracking-wider border-b-2 transition-colors -mb-px ${
      activeTab === tab
        ? 'border-stone-700 text-stone-700'
        : 'border-transparent text-stone-400 hover:text-stone-600'
    }`;

  const SaveBar = () => (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="submit"
        disabled={saving}
        className="px-6 py-2.5 bg-stone-800 text-white text-sm tracking-wider hover:bg-stone-700 transition-colors disabled:opacity-50 rounded-lg"
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
      {saveSuccess && (
        <span className="text-sm flex items-center gap-1 text-green-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Saved!
        </span>
      )}
    </div>
  );

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Event title */}
      <div className="mb-8">
        <h2 className="font-cormorant text-3xl text-stone-700">{event.name}</h2>
        <code className="text-xs text-stone-400">/{event.slug}</code>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 mb-8">
        <button onClick={() => setActiveTab('general')} className={tabClass('general')}>General</button>
        <button onClick={() => setActiveTab('albums')} className={tabClass('albums')}>Albums</button>
        <button onClick={() => setActiveTab('download')} className={tabClass('download')}>Download</button>
        {isAdmin && (
          <button onClick={() => setActiveTab('delete')} className={tabClass('delete')}>Delete</button>
        )}
      </div>

      {activeTab === 'general' && (
        <div className="max-w-lg">
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
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requireName}
                onChange={e => setRequireName(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 text-stone-800 focus:ring-stone-400"
              />
              <span className="text-sm text-stone-600">Require uploader name</span>
            </label>
            <SaveBar />
          </form>
        </div>
      )}

      {activeTab === 'albums' && (
        <div className="max-w-lg">
          <form onSubmit={handleSave} className="bg-white rounded-xl border border-stone-100 p-6 space-y-5">
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
                  <div
                    key={index}
                    draggable
                    onDragStart={() => onDragStart(index)}
                    onDragEnter={() => onDragEnter(index)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => onDrop(index)}
                    onDragEnd={onDragEnd}
                    className={`flex items-center gap-2 rounded-lg transition-colors ${dragOver === index ? 'bg-stone-100' : ''}`}
                  >
                    <div className="p-1 cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={album.name}
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
                {albums.length === 0 && (
                  <p className="text-stone-400 text-sm font-light py-2">No albums yet. Add one above.</p>
                )}
              </div>
            </div>

            {albums.filter(a => a.name.trim()).length > 0 && (
              <div>
                <label className="block text-xs tracking-widest text-stone-400 uppercase mb-1.5">Default Upload Album</label>
                <select
                  value={defaultAlbumName}
                  onChange={e => setDefaultAlbumName(e.target.value)}
                  className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-stone-700 focus:outline-none focus:border-stone-400 transition-colors text-sm bg-white"
                >
                  <option value="">No default</option>
                  {albums.filter(a => a.name.trim()).map((album, i) => (
                    <option key={i} value={album.name}>{album.name}</option>
                  ))}
                </select>
                <p className="text-xs text-stone-400 mt-1 font-light">Guest uploads will be placed in this album by default</p>
              </div>
            )}

            <SaveBar />
          </form>
        </div>
      )}

      {activeTab === 'download' && (
        <div className="max-w-lg">
          <div className="bg-white rounded-xl border border-stone-100 p-6 space-y-5">
            <div>
              <label className="block text-xs tracking-widest text-stone-400 uppercase mb-1.5">Album</label>
              <select
                value={downloadAlbumId}
                onChange={e => setDownloadAlbumId(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-stone-700 focus:outline-none focus:border-stone-400 transition-colors text-sm bg-white"
              >
                <option value="">All photos</option>
                {initialAlbums.map(album => (
                  <option key={album.id} value={album.id}>{album.name}</option>
                ))}
              </select>
              {!downloadAlbumId && (
                <p className="text-xs text-stone-400 mt-1 font-light">All photos will be organized into album folders</p>
              )}
            </div>
            <Link
              href={`/api/events/${event.slug}/download${downloadAlbumId ? `?album_id=${downloadAlbumId}` : ''}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-stone-800 text-white text-sm tracking-wider hover:bg-stone-700 transition-colors rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download ZIP
            </Link>
          </div>
        </div>
      )}

      {activeTab === 'delete' && isAdmin && (
        <div className="max-w-lg">
          <div className="bg-white rounded-xl border border-rose-100 p-6">
            <h3 className="text-sm font-medium text-rose-700 mb-2">Delete Event</h3>
            <p className="text-xs text-stone-400 mb-4 font-light">Permanently removes all photos, videos, and data associated with this event. This cannot be undone.</p>
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
      )}
    </main>
  );
}
