'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid email or password');
      setLoading(false);
    } else {
      router.push('/admin/dashboard');
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs tracking-widest text-stone-400 uppercase mb-1.5">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="admin@wedding.com"
          className="w-full border border-stone-200 rounded-lg px-4 py-3 text-stone-700 placeholder-stone-300 focus:outline-none focus:border-stone-400 transition-colors text-sm"
        />
      </div>
      <div>
        <label className="block text-xs tracking-widest text-stone-400 uppercase mb-1.5">Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          className="w-full border border-stone-200 rounded-lg px-4 py-3 text-stone-700 placeholder-stone-300 focus:outline-none focus:border-stone-400 transition-colors text-sm"
        />
      </div>

      {error && (
        <p className="text-rose-500 text-sm text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-stone-800 text-white text-sm tracking-widest uppercase hover:bg-stone-700 transition-colors disabled:opacity-50 rounded-lg"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
