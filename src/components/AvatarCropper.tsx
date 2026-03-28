'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

const CROP_SIZE = 240; // diameter of the visible crop circle (px)
const OUTPUT_SIZE = 400; // diameter of the exported image (px)

interface Props {
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

export default function AvatarCropper({ onSave, onCancel }: Props) {
  const [phase, setPhase] = useState<'pick' | 'loading' | 'crop'>('pick');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const srcRef = useRef<string | null>(null);
  // All crop state in a single ref to avoid stale closures in event handlers
  const crop = useRef({ scale: 1, ox: 0, oy: 0 });
  const drag = useRef<{ startX: number; startY: number; startOx: number; startOy: number } | null>(null);
  const pinchDist = useRef<number | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;
    const { scale, ox, oy } = crop.current;

    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);

    // Clip to circle and draw image
    ctx.save();
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    const iw = img.naturalWidth * scale;
    const ih = img.naturalHeight * scale;
    ctx.drawImage(img, CROP_SIZE / 2 - iw / 2 + ox, CROP_SIZE / 2 - ih / 2 + oy, iw, ih);
    ctx.restore();

    // Circle border
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = '#d6d3d1';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, []);

  // Attach non-passive wheel + touchmove listeners to the canvas
  useEffect(() => {
    if (phase !== 'crop') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      crop.current.scale = Math.min(10, Math.max(0.05, crop.current.scale * factor));
      redraw();
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && drag.current) {
        crop.current.ox = drag.current.startOx + (e.touches[0].clientX - drag.current.startX);
        crop.current.oy = drag.current.startOy + (e.touches[0].clientY - drag.current.startY);
        redraw();
      } else if (e.touches.length === 2 && pinchDist.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const factor = dist / pinchDist.current;
        pinchDist.current = dist;
        crop.current.scale = Math.min(10, Math.max(0.05, crop.current.scale * factor));
        redraw();
      }
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchmove', onTouchMove);
    };
  }, [phase, redraw]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (srcRef.current) URL.revokeObjectURL(srcRef.current);
    const url = URL.createObjectURL(file);
    srcRef.current = url;
    setPhase('loading');
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // Scale to fill the circle by default
      crop.current = {
        scale: Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight),
        ox: 0,
        oy: 0,
      };
      setPhase('crop');
      requestAnimationFrame(redraw);
    };
    img.src = url;
  };

  useEffect(() => {
    if (phase === 'crop') requestAnimationFrame(redraw);
  }, [phase, redraw]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    drag.current = {
      startX: e.clientX, startY: e.clientY,
      startOx: crop.current.ox, startOy: crop.current.oy,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    crop.current.ox = drag.current.startOx + (e.clientX - drag.current.startX);
    crop.current.oy = drag.current.startOy + (e.clientY - drag.current.startY);
    redraw();
  };

  const stopDrag = () => { drag.current = null; };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      drag.current = {
        startX: e.touches[0].clientX, startY: e.touches[0].clientY,
        startOx: crop.current.ox, startOy: crop.current.oy,
      };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDist.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchEnd = () => {
    drag.current = null;
    pinchDist.current = null;
  };

  const handleApply = () => {
    const img = imgRef.current;
    if (!img) return;
    const output = document.createElement('canvas');
    output.width = OUTPUT_SIZE;
    output.height = OUTPUT_SIZE;
    const ctx = output.getContext('2d')!;
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    const ratio = OUTPUT_SIZE / CROP_SIZE;
    const { scale, ox, oy } = crop.current;
    ctx.drawImage(
      img,
      (CROP_SIZE / 2 - img.naturalWidth * scale / 2 + ox) * ratio,
      (CROP_SIZE / 2 - img.naturalHeight * scale / 2 + oy) * ratio,
      img.naturalWidth * scale * ratio,
      img.naturalHeight * scale * ratio,
    );
    output.toBlob(blob => { if (blob) onSave(blob); }, 'image/jpeg', 0.92);
  };

  const handleChooseDifferent = () => {
    imgRef.current = null;
    setPhase('pick');
  };

  if (phase === 'pick') {
    return (
      <label className="flex flex-col items-center justify-center rounded-full border-2 border-dashed border-stone-200 cursor-pointer hover:border-stone-400 hover:bg-stone-50 transition-colors group"
        style={{ width: CROP_SIZE, height: CROP_SIZE }}>
        <svg className="w-7 h-7 text-stone-300 group-hover:text-stone-400 mb-1.5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <span className="text-sm text-stone-400 group-hover:text-stone-500 transition-colors">Upload photo</span>
        <input type="file" accept="image/*" className="sr-only" onChange={handleFile} />
      </label>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center rounded-full bg-stone-50"
        style={{ width: CROP_SIZE, height: CROP_SIZE }}>
        <svg className="w-6 h-6 text-stone-300 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs text-stone-400 font-light">Drag to position · Scroll or pinch to zoom</p>
      <canvas
        ref={canvasRef}
        width={CROP_SIZE}
        height={CROP_SIZE}
        className="cursor-grab active:cursor-grabbing touch-none"
        style={{ borderRadius: '50%' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />
      <div className="flex gap-2">
        <button type="button" onClick={handleApply}
          className="px-4 py-2 bg-stone-800 text-white text-sm rounded-lg hover:bg-stone-700 transition-colors">
          Apply
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 border border-stone-200 text-stone-600 text-sm rounded-lg hover:bg-stone-50 transition-colors">
          Cancel
        </button>
      </div>
      <button type="button" onClick={handleChooseDifferent}
        className="text-xs text-stone-400 hover:text-stone-600 transition-colors underline underline-offset-2">
        Choose a different photo
      </button>
    </div>
  );
}
