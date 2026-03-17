import getDb from '@/lib/db';
import { Album } from '@/types';

export const albumRepo = {
  findByEventId(eventId: number | string): Album[] {
    return getDb().prepare('SELECT * FROM albums WHERE event_id = ? ORDER BY "order" ASC').all(eventId) as Album[];
  },

  /** Replace all albums for an event (delete + re-insert) */
  replaceForEvent(eventId: number | string, names: string[]): void {
    const db = getDb();
    const insert = db.prepare('INSERT INTO albums (event_id, name, "order") VALUES (?, ?, ?)');
    db.transaction(() => {
      db.prepare('DELETE FROM albums WHERE event_id = ?').run(eventId);
      names.forEach((name, index) => {
        if (name.trim()) insert.run(eventId, name.trim(), index);
      });
    })();
  },
};
