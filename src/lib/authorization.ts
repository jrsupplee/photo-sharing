import type { Session } from 'next-auth';
import { eventPermissionTable } from '@/lib/tables';

export function isAdmin(session: Session | null): boolean {
  return session?.user?.role === 'admin';
}

export async function canManageEvent(session: Session | null, eventId: number | string): Promise<boolean> {
  if (!session) return false;
  if (session.user.role === 'admin') return true;
  return eventPermissionTable.hasPermission(session.user.id, eventId);
}
