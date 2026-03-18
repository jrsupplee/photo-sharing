'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Album } from '@/types';

const STORAGE_KEY = 'uploader_name';
const ALBUM_STORAGE_KEY = 'upload_album_id';

interface UploadFormProps {
  eventSlug: string;
  albums: Album[];
  defaultAlbumId?: number | null;
  requireName?: boolean;
  onUploadComplete?: () => void;
}

export default function UploadForm({ eventSlug, albums, defaultAlbumId, requireName = false, onUploadComplete }: UploadFormProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploaderName, setUploaderName] = useState('');
  const [caption, setCaption] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setUploaderName(saved);
  }, []);
  const [albumId, setAlbumId] = useState<string>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(ALBUM_STORAGE_KEY) : null;
    if (saved && albums.some(a => String(a.id) === saved)) return saved;
    if (defaultAlbumId != null && albums.some(a => a.id === defaultAlbumId)) return String(defaultAlbumId);
    return '';
  });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; duplicate: number } | null>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const pasteZoneRef = useRef<HTMLDivElement>(null);
  const PASTE_PLACEHOLDER = 'Tap here, then long-press and choose Paste';

  const extractFilesFromClipboard = useCallback((items: DataTransferItemList): File[] => {
    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === 'file' && (item.type.startsWith('image/') || item.type.startsWith('video/'))) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    return files;
  }, []);

  // Desktop: Cmd+V / Ctrl+V paste anywhere on the page
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const pasted = extractFilesFromClipboard(e.clipboardData.items);
      if (pasted.length > 0) setFiles(prev => [...prev, ...pasted]);
    };
    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [extractFilesFromClipboard]);

  const handlePasteZone = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pasted = extractFilesFromClipboard(e.clipboardData.items);
    if (pasted.length > 0) setFiles(prev => [...prev, ...pasted]);
    // Restore placeholder text after iOS inserts content
    if (pasteZoneRef.current) pasteZoneRef.current.textContent = PASTE_PLACEHOLDER;
  }, [extractFilesFromClipboard]);


  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter(
      f => f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    setFiles(prev => [...prev, ...dropped]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).filter(
        f => f.type.startsWith('image/') || f.type.startsWith('video/')
      );
      setFiles(prev => [...prev, ...selected]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    if (uploaderName) localStorage.setItem(STORAGE_KEY, uploaderName);
    if (albumId) localStorage.setItem(ALBUM_STORAGE_KEY, albumId);
    else localStorage.removeItem(ALBUM_STORAGE_KEY);
    const sessionId = document.cookie.match(/(?:^|; )session_id=([^;]*)/)?.[1] ?? null;

    setUploading(true);
    setProgress(0);
    let success = 0;
    let failed = 0;
    let duplicate = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      if (uploaderName) formData.append('uploader_name', uploaderName);
      if (caption) formData.append('caption', caption);
      if (albumId) formData.append('album_id', albumId);
      if (sessionId) formData.append('session_id', sessionId);

      try {
        const res = await fetch(`/api/events/${eventSlug}/media`, {
          method: 'POST',
          body: formData,
        });
        if (res.ok) success++;
        else if (res.status === 409) duplicate++;
        else failed++;
      } catch {
        failed++;
      }

      setProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setUploading(false);
    setResults({ success, failed, duplicate });
    setFiles([]);
    setCaption('');
    if (onUploadComplete) onUploadComplete();
  };

  if (results) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sage-100 border border-sage-200">
          <svg className="w-8 h-8 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-cormorant text-2xl text-stone-700">Thank You!</h3>
        <p className="text-stone-500 font-light">
          {results.success} photo{results.success !== 1 ? 's' : ''} shared successfully
          {results.duplicate > 0 && `, ${results.duplicate} already uploaded`}
          {results.failed > 0 && `, ${results.failed} failed`}
        </p>
        <button
          onClick={() => setResults(null)}
          className="mt-4 px-6 py-2.5 border border-stone-300 text-stone-600 text-sm tracking-wider hover:bg-stone-50 transition-colors rounded"
        >
          Upload More
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Drop zone — desktop only */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative hidden sm:block border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? 'border-stone-400 bg-stone-50'
            : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50/50'
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <svg className="w-10 h-10 mx-auto mb-3 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-stone-500 font-light">Drop your photos & videos here</p>
        <p className="text-stone-400 text-sm mt-1">or click to browse · or paste</p>
      </div>

      {/* Mobile file picker + paste zone */}
      <div className="sm:hidden space-y-3">
        <input
          ref={mobileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="sr-only"
        />
        <button
          type="button"
          onClick={() => mobileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-stone-200 rounded-xl py-6 text-center text-stone-500 font-light hover:border-stone-300 hover:bg-stone-50/50 transition-all"
        >
          <svg className="w-8 h-8 mx-auto mb-2 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Tap to choose photos & videos
        </button>
        <div
          ref={pasteZoneRef}
          contentEditable
          suppressContentEditableWarning
          onPaste={handlePasteZone}
          onInput={(e) => { e.currentTarget.textContent = PASTE_PLACEHOLDER; }}
          className="w-full py-4 px-4 border border-stone-200 rounded-xl text-center text-stone-400 text-sm font-light focus:outline-none focus:border-stone-400 transition-colors cursor-text"
        >
          {PASTE_PLACEHOLDER}
        </div>
      </div>

      {/* File previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {files.map((file, index) => (
            <div key={index} className="relative group aspect-square rounded-lg overflow-hidden bg-stone-100">
              {file.type.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-stone-200">
                  <svg className="w-8 h-8 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.867v6.266a1 1 0 01-1.447.902L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Fields */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs tracking-widest text-stone-400 uppercase mb-1.5">
            Your Name{requireName && <span className="text-rose-400 ml-0.5">*</span>}
          </label>
          <input
            type="text"
            value={uploaderName}
            onChange={e => setUploaderName(e.target.value)}
            placeholder="Jane & John"
            required={requireName}
            className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-stone-700 placeholder-stone-300 focus:outline-none focus:border-stone-400 transition-colors text-sm"
          />
        </div>
        {albums.length > 1 && (
          <div>
            <label className="block text-xs tracking-widest text-stone-400 uppercase mb-1.5">Album</label>
            <select
              value={albumId}
              onChange={e => setAlbumId(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-stone-700 focus:outline-none focus:border-stone-400 transition-colors text-sm bg-white"
            >
              <option value="">Select album</option>
              {albums.map(album => (
                <option key={album.id} value={album.id}>{album.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs tracking-widest text-stone-400 uppercase mb-1.5">Caption</label>
        <input
          type="text"
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="A beautiful moment..."
          className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-stone-700 placeholder-stone-300 focus:outline-none focus:border-stone-400 transition-colors text-sm"
        />
      </div>

      {/* Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-stone-400 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-stone-400 text-xs text-center">{progress}% uploaded</p>
        </div>
      )}

      <button
        type="submit"
        disabled={files.length === 0 || uploading}
        className="w-full py-3 bg-stone-800 text-white text-sm tracking-widest uppercase hover:bg-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed rounded-lg"
      >
        {uploading ? 'Uploading...' : `Share ${files.length > 0 ? files.length : ''} Photo${files.length !== 1 ? 's' : ''}`}
      </button>
    </form>
  );
}
