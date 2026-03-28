import { redirect } from 'next/navigation';
import { getSession } from '@/lib/getSession';
import AdminLoginForm from '../LoginForm';

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session) {
    redirect('/admin/dashboard');
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-12 h-px bg-stone-300 mx-auto mb-6" />
          <h1 className="font-cormorant text-4xl font-light text-stone-700 mb-2">Admin</h1>
          <p className="text-stone-400 text-xs tracking-widest uppercase font-light">Wedding Memories</p>
          <div className="w-12 h-px bg-stone-300 mx-auto mt-6" />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8">
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
