import type Database from 'better-sqlite3';
import getDb from '@/lib/db';
import { Album } from '@/types';

export function createTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      "order" INTEGER DEFAULT 0,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );
  `);
}

export const albumTable = {
  findByEventId(eventId: number | string): Album[] {
    return getDb().prepare('SELECT * FROM albums WHERE event_id = ? ORDER BY "order" ASC').all(eventId) as Album[];
  },

  /** Update albums for an event: update existing (by id), insert new (id=0), delete removed */
  updateForEvent(eventId: number | string, albums: { id: number; name: string; order: number }[]): void {
    const db = getDb();
    const existingIds = new Set(
      (db.prepare('SELECT id FROM albums WHERE event_id = ?').all(eventId) as { id: number }[]).map(r => r.id)
    );
    const incomingIds = new Set(albums.filter(a => a.id > 0).map(a => a.id));

    db.transaction(() => {
      for (const existingId of existingIds) {
        if (!incomingIds.has(existingId)) {
          db.prepare('DELETE FROM albums WHERE id = ?').run(existingId);
        }
      }
      for (const album of albums) {
        if (album.id > 0 && existingIds.has(album.id)) {
          db.prepare('UPDATE albums SET name = ?, "order" = ? WHERE id = ?').run(album.name, album.order, album.id);
        } else {
          db.prepare('INSERT INTO albums (event_id, name, "order") VALUES (?, ?, ?)').run(eventId, album.name, album.order);
        }
      }
    })();
  },
};
