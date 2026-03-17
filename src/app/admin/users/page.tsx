import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/getSession';
import { userTable, eventTable } from '@/lib/tables';
import { isAdmin } from '@/lib/authorization';
import UsersClient from './UsersClient';

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect('/admin');
  if (!isAdmin(session)) redirect('/admin/dashboard');

  const users = userTable.list();
  const events = eventTable.listAll();

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-stone-100 bg-white/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/admin/dashboard"
            className="text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </Link>
          <h1 className="font-cormorant text-xl text-stone-700">Users</h1>
          <div className="w-20" />
        </div>
      </header>
      <UsersClient users={users} events={events} currentUserId={session.user.id} />
    </div>
  );
}
