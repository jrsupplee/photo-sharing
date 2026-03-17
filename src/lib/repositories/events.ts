import getDb from '@/lib/db';
import { Event } from '@/types';

export const eventRepo = {
  /** Public listing ordered by event date */
  listByDate(): Event[] {
    return getDb().prepare('SELECT * FROM events ORDER BY date_start ASC').all() as Event[];
  },

  /** Admin listing with media/album counts, ordered by creation date */
  listWithCounts(): (Event & { media_count: number; album_count: number })[] {
    return getDb().prepare(`
      SELECT e.*,
        (SELECT COUNT(*) FROM media m WHERE m.event_id = e.id) as media_count,
        (SELECT COUNT(*) FROM albums a WHERE a.event_id = e.id) as album_count
      FROM events e
      ORDER BY e.created_at DESC
    `).all() as (Event & { media_count: number; album_count: number })[];
  },

  /** Admin API listing ordered by creation date */
  listAll(): Event[] {
    return getDb().prepare('SELECT * FROM events ORDER BY created_at DESC').all() as Event[];
  },

  findById(id: number | string): Event | undefined {
    return getDb().prepare('SELECT * FROM events WHERE id = ?').get(id) as Event | undefined;
  },

  findBySlug(slug: string): Event | undefined {
    return getDb().prepare('SELECT * FROM events WHERE slug = ?').get(slug) as Event | undefined;
  },

  slugExists(slug: string): boolean {
    return !!getDb().prepare('SELECT id FROM events WHERE slug = ?').get(slug);
  },

  create(slug: string, name: string, dateStart: string | null, dateEnd: string | null, albums: string[]): Event {
    const db = getDb();
    const insertEvent = db.prepare('INSERT INTO events (slug, name, date_start, date_end) VALUES (?, ?, ?, ?)');
    const insertAlbum = db.prepare('INSERT INTO albums (event_id, name, "order") VALUES (?, ?, ?)');

    const eventId = db.transaction(() => {
      const result = insertEvent.run(slug, name, dateStart, dateEnd);
      const id = result.lastInsertRowid;
      albums.forEach((albumName, index) => {
        if (albumName.trim()) insertAlbum.run(id, albumName.trim(), index);
      });
      return id;
    })();

    return db.prepare('SELECT * FROM events WHERE id = ?').get(eventId) as Event;
  },

  update(id: number | string, name: string, dateStart: string | null, dateEnd: string | null): Event {
    const db = getDb();
    db.prepare('UPDATE events SET name = ?, date_start = ?, date_end = ? WHERE id = ?')
      .run(name, dateStart, dateEnd, id);
    return db.prepare('SELECT * FROM events WHERE id = ?').get(id) as Event;
  },

  delete(id: number | string): void {
    getDb().prepare('DELETE FROM events WHERE id = ?').run(id);
  },
};
