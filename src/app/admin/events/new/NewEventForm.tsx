'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewEventForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [albums, setAlbums] = useState(['Ceremony', 'Reception']);
  const [requireName, setRequireName] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  };

  const addAlbum = () => {
    setAlbums(prev => [...prev, '']);
  };

  const updateAlbum = (index: number, value: string) => {
    setAlbums(prev => prev.map((a, i) => (i === index ? value : a)));
  };

  const removeAlbum = (index: number) => {
    setAlbums(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        slug,
        date_start: dateStart || null,
        date_end: dateEnd || null,
        albums: albums.filter(a => a.trim()),
        require_name: requireName,
      }),
    });

    if (res.ok) {
      router.push('/admin/dashboard');
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to create event');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-xs tracking-widest text-stone-400 uppercase mb-1.5">Event Name *</label>
        <input
          type="text"
          value={name}
          onChange={e => handleNameChange(e.target.value)}
          required
          placeholder="Sarah & Michael's Wedding"
          className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-stone-700 placeholder-stone-300 focus:outline-none focus:border-stone-400 transition-colors text-sm"
        />
      </div>

      <div>
        <label className="block text-xs tracking-widest text-stone-400 uppercase mb-1.5">URL Slug *</label>
        <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden focus-within:border-stone-400 transition-colors">
          <span className="px-3 py-2.5 text-stone-300 text-sm bg-stone-50 border-r border-stone-200">/</span>
          <input
            type="text"
            value={slug}
            onChange={e => setSlug(generateSlug(e.target.value))}
            required
            placeholder="sarah-michael-wedding"
            className="flex-1 px-3 py-2.5 text-stone-700 placeholder-stone-300 focus:outline-none text-sm"
          />
        </div>
        <p className="text-stone-400 text-xs mt-1">This will be the URL for your event gallery</p>
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
          <button
            type="button"
            onClick={addAlbum}
            className="text-xs text-stone-500 hover:text-stone-700 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Album
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
                className="flex-1 border border-stone-200 rounded-lg px-4 py-2.5 text-stone-700 placeholder-stone-300 focus:outline-none focus:border-stone-400 transition-colors text-sm"
              />
              <button
                type="button"
                onClick={() => removeAlbum(index)}
                className="p-2 text-stone-300 hover:text-rose-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {albums.length === 0 && (
            <p className="text-stone-400 text-xs italic">No albums — all media will be ungrouped</p>
          )}
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

      {error && (
        <p className="text-rose-500 text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-stone-800 text-white text-sm tracking-widest uppercase hover:bg-stone-700 transition-colors disabled:opacity-50 rounded-lg"
      >
        {submitting ? 'Creating...' : 'Create Event'}
      </button>
    </form>
  );
}
