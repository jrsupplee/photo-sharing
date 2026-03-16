'use client';

import { useState, useEffect } from 'react';

interface Status {
  total: number;
  missing: number;
}

interface Result {
  total: number;
  processed: number;
  failed: number;
  errors: string[];
}

export default function BackfillVariants() {
  const [status, setStatus] = useState<Status | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    fetch('/api/admin/backfill-variants')
      .then(r => r.json())
      .then(setStatus);
  }, []);

  const run = async () => {
    setRunning(true);
    setResult(null);
    const res = await fetch('/api/admin/backfill-variants', { method: 'POST' });
    const data = await res.json();
    setResult(data);
    setStatus(s => s ? { ...s, missing: data.failed } : null);
    setRunning(false);
  };

  if (!status || status.missing === 0 && !result) return null;

  return (
    <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-amber-800">Image variants missing</h3>
          {result ? (
            <p className="text-sm text-amber-700 mt-0.5 font-light">
              Done — {result.processed} processed
              {result.failed > 0 && `, ${result.failed} failed`}
            </p>
          ) : (
            <p className="text-sm text-amber-700 mt-0.5 font-light">
              {status.missing} of {status.total} image{status.total !== 1 ? 's' : ''} need thumbnails generated
            </p>
          )}
          {result?.errors.length ? (
            <ul className="mt-2 space-y-0.5">
              {result.errors.map((e, i) => (
                <li key={i} className="text-xs text-red-600 font-mono">{e}</li>
              ))}
            </ul>
          ) : null}
        </div>
        {!result && (
          <button
            onClick={run}
            disabled={running}
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {running && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {running ? 'Processing…' : 'Generate now'}
          </button>
        )}
      </div>
    </div>
  );
}
