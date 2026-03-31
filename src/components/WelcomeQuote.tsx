'use client';

import { useEffect, useState } from 'react';

export default function WelcomeQuote() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('welcome_seen')) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem('welcome_seen', '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={dismiss}
    >
      <div
        className="bg-cream max-w-sm mx-4 px-10 py-10 text-center shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-px bg-gold mx-auto mb-6" />
        <p className="font-cormorant text-2xl font-light text-stone-700 italic leading-relaxed">
          The essence of friendship is sharing.
        </p>
        <p className="mt-4 text-stone-400 text-sm tracking-widest uppercase">— Aristotle</p>
        <div className="w-12 h-px bg-gold mx-auto mt-6" />
        <button
          onClick={dismiss}
          className="mt-8 px-8 py-2 border border-stone-300 text-stone-500 text-xs tracking-widest uppercase hover:bg-stone-100 transition-colors"
        >
          Enter
        </button>
      </div>
    </div>
  );
}
