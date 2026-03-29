'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Event, Album } from '@/types';
import Link from 'next/link';
import QRCode from 'qrcode';
import AvatarCropper from '@/components/AvatarCropper';

interface Props {
  event: Event;
  albums: Album[];
  isAdmin: boolean;
  qrScanCount: number;
}

export default function EventManageClient({ event, albums: initialAlbums, isAdmin, qrScanCount }: Props) {
  const router = useRouter();
  const [name, setName] = useState(event.name);
  const [dateStart, setDateStart] = useState(event.date_start || '');
  const [dateEnd, setDateEnd] = useState(event.date_end || '');
  const [requireName, setRequireName] = useState(!!event.require_name);
  const [albums, setAlbums] = useState<{ id: number; name: string; read_only: boolean }[]>(
    initialAlbums.map(a => ({ id: a.id, name: a.name, read_only: !!a.read_only }))
  );
  const [defaultAlbumName, setDefaultAlbumName] = useState<string>(
    initialAlbums.find(a => a.id === event.default_album_id)?.name ?? ''
  );
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'albums' | 'download' | 'delete'>('general');
  const [downloadAlbumId, setDownloadAlbumId] = useState<string>('');
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [qrPng, setQrPng] = useState<string | null>(null);
  const [avatarKey, setAvatarKey] = useState<string | null>(event.avatar_key ?? null);
  const [showCropper, setShowCropper] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    const url = `${window.location.origin}/q/${event.slug}`;

    async function build() {
      const [svgStr, pngDataUrl] = await Promise.all([
        QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'H', margin: 2, width: 120 }),
        QRCode.toDataURL(url, { type: 'image/png', errorCorrectionLevel: 'H', margin: 2, width: 512 }),
      ]);

      if (!avatarKey) {
        setQrSvg(svgStr);
        setQrPng(pngDataUrl);
        return;
      }

      // Fetch avatar as base64 data URL
      const avatarBlob = await fetch(`/api/files/${avatarKey}`).then(r => r.blob());
      const avatarDataUrl = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(avatarBlob);
      });

      // SVG: embed circular avatar at centre using viewBox coordinates
      const viewBoxMatch = svgStr.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
      const vbW = viewBoxMatch ? parseFloat(viewBoxMatch[1]) : 120;
      const vbH = viewBoxMatch ? parseFloat(viewBoxMatch[2]) : 120;
      const avSize = vbW * 0.35;
      const avX = (vbW - avSize) / 2;
      const avY = (vbH - avSize) / 2;
      const avR = avSize / 2;
      const avCx = avX + avR;
      const avCy = avY + avR;
      const svgWithAvatar = svgStr.replace(
        '</svg>',
        `<defs><clipPath id="qr-av"><circle cx="${avCx}" cy="${avCy}" r="${avR}"/></clipPath></defs>` +
        `<circle cx="${avCx}" cy="${avCy}" r="${avR * 1.15}" fill="white"/>` +
        `<image href="${avatarDataUrl}" x="${avX}" y="${avY}" width="${avSize}" height="${avSize}" clip-path="url(#qr-av)"/></svg>`
      );
      setQrSvg(svgWithAvatar);

      // PNG: composite avatar onto canvas
      const qrSize = 512;
      const canvas = document.createElement('canvas');
      canvas.width = qrSize;
      canvas.height = qrSize;
      const ctx = canvas.getContext('2d')!;
      await new Promise<void>(resolve => {
        const img = new Image();
        img.onload = () => { ctx.drawImage(img, 0, 0, qrSize, qrSize); resolve(); };
        img.src = pngDataUrl;
      });
      const avPx = Math.round(qrSize * 0.35);
      const avOff = Math.round((qrSize - avPx) / 2);
      const avCxPx = avOff + avPx / 2;
      const avCyPx = avOff + avPx / 2;
      ctx.beginPath();
      ctx.arc(avCxPx, avCyPx, avPx / 2 * 1.15, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
      await new Promise<void>(resolve => {
        const img = new Image();
        img.onload = () => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(avCxPx, avCyPx, avPx / 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, avOff, avOff, avPx, avPx);
          ctx.restore();
          resolve();
        };
        img.src = avatarDataUrl;
      });
      setQrPng(canvas.toDataURL('image/png'));
    }

    build();
  }, [event.slug, avatarKey]);

  const addAlbum = () => setAlbums(prev => [...prev, { id: 0, name: '', read_only: false }]);
  const updateAlbum = (i: number, v: string) => {
    if (albums[i].name === defaultAlbumName) setDefaultAlbumName(v);
    setAlbums(prev => prev.map((a, idx) => idx === i ? { ...a, name: v } : a));
  };
  const toggleReadOnly = async (i: number) => {
    const album = albums[i];
    const newReadOnly = !album.read_only;
    setAlbums(prev => prev.map((a, idx) => idx === i ? { ...a, read_only: newReadOnly } : a));
    await fetch(`/api/albums/${album.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read_only: newReadOnly }),
    });
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

  const saveEvent = async (albumsOverride?: typeof albums) => {
    const albumsToSave = albumsOverride ?? albums;
    return fetch(`/api/events/${event.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        date_start: dateStart || null,
        date_end: dateEnd || null,
        albums: albumsToSave.filter(a => a.name.trim()).map((a, i) => ({ id: a.id, name: a.name.trim(), order: i, read_only: a.read_only })),
        default_album_name: defaultAlbumName || null,
        require_name: requireName,
      }),
    });
  };

  const handleAvatarSave = async (blob: Blob) => {
    setUploadingAvatar(true);
    const form = new FormData();
    form.append('file', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
    const res = await fetch(`/api/events/${event.id}/avatar`, { method: 'POST', body: form });
    if (res.ok) {
      const data = await res.json();
      setAvatarKey(data.avatar_key);
    }
    setUploadingAvatar(false);
    setShowCropper(false);
  };

  const handleAvatarRemove = async () => {
    const res = await fetch(`/api/events/${event.id}/avatar`, { method: 'DELETE' });
    if (res.ok) setAvatarKey(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await saveEvent();
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
            {/* Avatar */}
            <div>
              <label className="block text-xs tracking-widest text-stone-400 uppercase mb-3">Event Avatar</label>
              {showCropper ? (
                <div>
                  {uploadingAvatar ? (
                    <div className="flex items-center gap-2 text-sm text-stone-400">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Uploading…
                    </div>
                  ) : (
                    <AvatarCropper onSave={handleAvatarSave} onCancel={() => setShowCropper(false)} />
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden border border-stone-200 bg-stone-50 flex items-center justify-center shrink-0">
                    {avatarKey ? (
                      <img src={`/api/files/${avatarKey}`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-8 h-8 text-stone-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCropper(true)}
                      className="px-3 py-1.5 border border-stone-200 text-stone-600 text-xs tracking-wider hover:bg-stone-50 transition-colors rounded-lg"
                    >
                      {avatarKey ? 'Change Avatar' : 'Upload Avatar'}
                    </button>
                    {avatarKey && (
                      <button
                        type="button"
                        onClick={handleAvatarRemove}
                        className="text-xs text-stone-400 hover:text-rose-500 transition-colors text-left"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
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
            <div>
              <label className="block text-xs tracking-widest text-stone-400 uppercase mb-3">QR Code</label>
              <div className="flex items-start gap-4">
                <div className="border border-stone-100 rounded-lg p-2 shrink-0">
                  {qrSvg ? (
                    <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
                  ) : (
                    <div className="w-[120px] h-[120px] flex items-center justify-center text-stone-200">
                      <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 justify-end pt-1">
                  <p className="text-xs text-stone-400 font-light">Scan to open the guest gallery</p>
                  <p className="text-xs text-stone-400 font-light">{qrScanCount} {qrScanCount === 1 ? 'scan' : 'scans'}</p>
                  <button
                    type="button"
                    disabled={!qrSvg}
                    onClick={() => {
                      if (!qrSvg) return;
                      const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${event.slug}-qr.svg`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 text-stone-600 text-xs tracking-wider hover:bg-stone-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed rounded-lg"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download SVG
                  </button>
                  <button
                    type="button"
                    disabled={!qrPng}
                    onClick={() => {
                      if (!qrPng) return;
                      const a = document.createElement('a');
                      a.href = qrPng;
                      a.download = `${event.slug}-qr.png`;
                      a.click();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 text-stone-600 text-xs tracking-wider hover:bg-stone-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed rounded-lg"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download PNG
                  </button>
                </div>
              </div>
            </div>
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
                    <button
                      type="button"
                      onClick={() => toggleReadOnly(index)}
                      title={album.read_only ? 'Read-only (guests cannot upload)' : 'Writable (guests can upload)'}
                      className={`p-2 transition-colors ${album.read_only ? 'text-amber-500 hover:text-amber-600' : 'text-stone-300 hover:text-stone-500'}`}
                    >
                      {album.read_only ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
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
