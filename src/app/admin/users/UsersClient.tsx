'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Event } from '@/types';

interface Props {
  users: User[];
  events: Event[];
  currentUserId: string;
}

export default function UsersClient({ users: initialUsers, events, currentUserId }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ email: '', name: '', password: '', role: 'event_manager' as 'admin' | 'event_manager' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '', role: 'event_manager' as 'admin' | 'event_manager' });
  const [permissionsUserId, setPermissionsUserId] = useState<number | null>(null);
  const [permissionEventIds, setPermissionEventIds] = useState<number[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newForm),
    });
    if (res.ok) {
      const user = await res.json();
      setUsers(prev => [...prev, user]);
      setNewForm({ email: '', name: '', password: '', role: 'event_manager' });
      setShowNew(false);
    }
    setSaving(false);
  };

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setEditForm({ name: user.name, email: user.email, password: '', role: user.role });
  };

  const handleEdit = async (e: React.FormEvent, userId: number) => {
    e.preventDefault();
    setSaving(true);
    const body: Record<string, string> = { name: editForm.name, email: editForm.email, role: editForm.role };
    if (editForm.password) body.password = editForm.password;
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers(prev => prev.map(u => u.id === userId ? updated : u));
      setEditingId(null);
    }
    setSaving(false);
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Delete this user?')) return;
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      router.refresh();
    }
  };

  const openPermissions = async (user: User) => {
    const res = await fetch(`/api/admin/users/${user.id}/events`);
    const data = await res.json();
    setPermissionEventIds(data.event_ids || []);
    setPermissionsUserId(user.id);
  };

  const handleSavePermissions = async () => {
    if (!permissionsUserId) return;
    setSavingPermissions(true);
    await fetch(`/api/admin/users/${permissionsUserId}/events`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_ids: permissionEventIds }),
    });
    setSavingPermissions(false);
    setPermissionsUserId(null);
  };

  const toggleEventPermission = (eventId: number) => {
    setPermissionEventIds(prev =>
      prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
    );
  };

  const inputCls = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-stone-700 text-sm focus:outline-none focus:border-stone-400 transition-colors';

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-cormorant text-3xl text-stone-700">Users</h2>
        <button
          onClick={() => setShowNew(v => !v)}
          className="flex items-center gap-2 px-5 py-2.5 bg-stone-800 text-white text-sm tracking-wider hover:bg-stone-700 transition-colors rounded-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </button>
      </div>

      {showNew && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-stone-100 p-6 mb-6 space-y-4">
          <h3 className="text-sm font-medium text-stone-600 tracking-wider uppercase">New User</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-stone-400 uppercase tracking-widest mb-1.5">Name</label>
              <input className={inputCls} required value={newForm.name} onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-stone-400 uppercase tracking-widest mb-1.5">Email</label>
              <input type="email" className={inputCls} required value={newForm.email} onChange={e => setNewForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-stone-400 uppercase tracking-widest mb-1.5">Password</label>
              <input type="password" className={inputCls} required value={newForm.password} onChange={e => setNewForm(p => ({ ...p, password: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-stone-400 uppercase tracking-widest mb-1.5">Role</label>
              <select className={inputCls + ' bg-white'} value={newForm.role} onChange={e => setNewForm(p => ({ ...p, role: e.target.value as 'admin' | 'event_manager' }))}>
                <option value="event_manager">Event Manager</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="px-5 py-2 bg-stone-800 text-white text-sm rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50">
              {saving ? 'Creating…' : 'Create User'}
            </button>
            <button type="button" onClick={() => setShowNew(false)} className="px-5 py-2 border border-stone-200 text-stone-500 text-sm rounded-lg hover:bg-stone-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {users.map(user => (
          <div key={user.id} className="bg-white rounded-xl border border-stone-100 p-5">
            {editingId === user.id ? (
              <form onSubmit={e => handleEdit(e, user.id)} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-stone-400 uppercase tracking-widest mb-1.5">Name</label>
                    <input className={inputCls} required value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-400 uppercase tracking-widest mb-1.5">Email</label>
                    <input type="email" className={inputCls} required value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-400 uppercase tracking-widest mb-1.5">New Password <span className="normal-case">(leave blank to keep)</span></label>
                    <input type="password" className={inputCls} value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-400 uppercase tracking-widest mb-1.5">Role</label>
                    <select className={inputCls + ' bg-white'} value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value as 'admin' | 'event_manager' }))}>
                      <option value="event_manager">Event Manager</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-stone-800 text-white text-sm rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 border border-stone-200 text-stone-500 text-sm rounded-lg hover:bg-stone-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-stone-700">{user.name}</p>
                  <p className="text-stone-400 text-sm">{user.email}</p>
                  <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500'}`}>
                    {user.role === 'admin' ? 'Administrator' : 'Event Manager'}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {user.role === 'event_manager' && (
                    <button
                      onClick={() => openPermissions(user)}
                      className="px-3 py-1.5 border border-stone-200 text-stone-500 text-xs rounded-lg hover:bg-stone-50 transition-colors"
                    >
                      Events
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(user)}
                    className="px-3 py-1.5 border border-stone-200 text-stone-500 text-xs rounded-lg hover:bg-stone-50 transition-colors"
                  >
                    Edit
                  </button>
                  {String(user.id) !== currentUserId && (
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="px-3 py-1.5 border border-rose-200 text-rose-500 text-xs rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Event permissions modal */}
      {permissionsUserId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-cormorant text-xl text-stone-700">Event Access</h3>
              <button onClick={() => setPermissionsUserId(null)} className="text-stone-400 hover:text-stone-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-stone-400 text-sm">Select which events this user can manage.</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-stone-400 text-sm italic">No events yet.</p>
              ) : events.map(event => (
                <label key={event.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-stone-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissionEventIds.includes(event.id)}
                    onChange={() => toggleEventPermission(event.id)}
                    className="rounded"
                  />
                  <span className="text-stone-700 text-sm">{event.name}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSavePermissions}
                disabled={savingPermissions}
                className="flex-1 py-2.5 bg-stone-800 text-white text-sm rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50"
              >
                {savingPermissions ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setPermissionsUserId(null)}
                className="flex-1 py-2.5 border border-stone-200 text-stone-500 text-sm rounded-lg hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
