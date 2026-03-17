import type { Session } from 'next-auth';
import { eventPermissionRepo } from '@/lib/repositories';

export function isAdmin(session: Session | null): boolean {
  return session?.user?.role === 'admin';
}

export function canManageEvent(session: Session | null, eventId: number | string): boolean {
  if (!session) return false;
  if (session.user.role === 'admin') return true;
  return eventPermissionRepo.hasPermission(session.user.id, eventId);
}
