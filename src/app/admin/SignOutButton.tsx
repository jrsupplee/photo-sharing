'use client';

import { signOut } from 'next-auth/react';

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/admin/login' })}
      className="text-stone-400 hover:text-stone-600 text-sm transition-colors"
    >
      Sign Out
    </button>
  );
}
