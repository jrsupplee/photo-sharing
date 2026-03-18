import type { DbAdapter } from '@/lib/db/adapter';
import getDb from '@/lib/db';
import type { Album } from './albums';

export interface Event {
  id: number;
  slug: string;
  name: string;
  date_start: string | null;
  date_end: string | null;
  default_album_id: number | null;
  require_name: number;
  created_at: string;
}

export const eventTable = {
  async create(adapter: DbAdapter): Promise<void> {
    if (adapter.dialect === 'mysql') {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS events (
          id INT AUTO_INCREMENT PRIMARY KEY,
          slug VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          date_start VARCHAR(20),
          date_end VARCHAR(20),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      if (!(await adapter.columnExists('events', 'default_album_id'))) {
        await adapter.exec('ALTER TABLE events ADD COLUMN default_album_id INT');
      }
      if (!(await adapter.columnExists('events', 'require_name'))) {
        await adapter.exec('ALTER TABLE events ADD COLUMN require_name TINYINT(1) NOT NULL DEFAULT 0');
      }
    } else if (adapter.dialect === 'postgres') {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS events (
          id SERIAL PRIMARY KEY,
          slug VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          date_start VARCHAR(20),
          date_end VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      if (!(await adapter.columnExists('events', 'default_album_id'))) {
        await adapter.exec('ALTER TABLE events ADD COLUMN default_album_id INT');
      }
      if (!(await adapter.columnExists('events', 'require_name'))) {
        await adapter.exec('ALTER TABLE events ADD COLUMN require_name SMALLINT NOT NULL DEFAULT 0');
      }
    } else {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          slug TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          date_start TEXT,
          date_end TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `);
      if (!(await adapter.columnExists('events', 'default_album_id'))) {
        await adapter.exec('ALTER TABLE events ADD COLUMN default_album_id INTEGER');
      }
      if (!(await adapter.columnExists('events', 'require_name'))) {
        await adapter.exec('ALTER TABLE events ADD COLUMN require_name INTEGER NOT NULL DEFAULT 0');
      }
    }
  },

  async listByDate(): Promise<Event[]> {
    const db = await getDb();
    return db.query<Event>('SELECT * FROM events ORDER BY date_start ASC');
  },

  async listWithCounts(): Promise<(Event & { media_count: number; album_count: number })[]> {
    const db = await getDb();
    return db.query<Event & { media_count: number; album_count: number }>(`
      SELECT e.*,
        (SELECT COUNT(*) FROM media m WHERE m.event_id = e.id) as media_count,
        (SELECT COUNT(*) FROM albums a WHERE a.event_id = e.id) as album_count
      FROM events e
      ORDER BY e.created_at DESC
    `);
  },

  async listWithCountsForUser(userId: number | string): Promise<(Event & { media_count: number; album_count: number })[]> {
    const db = await getDb();
    return db.query<Event & { media_count: number; album_count: number }>(`
      SELECT e.*,
        (SELECT COUNT(*) FROM media m WHERE m.event_id = e.id) as media_count,
        (SELECT COUNT(*) FROM albums a WHERE a.event_id = e.id) as album_count
      FROM events e
      INNER JOIN event_permissions ep ON e.id = ep.event_id
      WHERE ep.user_id = ?
      ORDER BY e.created_at DESC
    `, [userId]);
  },

  async listAll(): Promise<Event[]> {
    const db = await getDb();
    return db.query<Event>('SELECT * FROM events ORDER BY created_at DESC');
  },

  async findById(id: number | string): Promise<Event | undefined> {
    const db = await getDb();
    return db.queryOne<Event>('SELECT * FROM events WHERE id = ?', [id]);
  },

  async findBySlug(slug: string): Promise<Event | undefined> {
    const db = await getDb();
    return db.queryOne<Event>('SELECT * FROM events WHERE slug = ?', [slug]);
  },

  async slugExists(slug: string): Promise<boolean> {
    const db = await getDb();
    return !!(await db.queryOne('SELECT id FROM events WHERE slug = ?', [slug]));
  },

  async insert(
    slug: string,
    name: string,
    dateStart: string | null,
    dateEnd: string | null,
    albums: string[],
    requireName: boolean = false,
  ): Promise<Event> {
    const db = await getDb();
    const orderCol = db.dialect === 'mysql' ? '`order`' : '"order"';
    const eventId = await db.transaction(async tx => {
      const res = await tx.execute(
        'INSERT INTO events (slug, name, date_start, date_end, require_name) VALUES (?, ?, ?, ?, ?)',
        [slug, name, dateStart, dateEnd, requireName ? 1 : 0],
      );
      for (const [index, albumName] of albums.entries()) {
        if (albumName.trim()) {
          await tx.execute(
            `INSERT INTO albums (event_id, name, ${orderCol}) VALUES (?, ?, ?)`,
            [Number(res.lastInsertId), albumName.trim(), index],
          );
        }
      }
      return res.lastInsertId;
    });
    return (await db.queryOne<Event>('SELECT * FROM events WHERE id = ?', [eventId]))!;
  },

  async update(
    id: number | string,
    name: string,
    dateStart: string | null,
    dateEnd: string | null,
    requireName: boolean = false,
  ): Promise<Event> {
    const db = await getDb();
    await db.execute(
      'UPDATE events SET name = ?, date_start = ?, date_end = ?, require_name = ? WHERE id = ?',
      [name, dateStart, dateEnd, requireName ? 1 : 0, id],
    );
    return (await db.queryOne<Event>('SELECT * FROM events WHERE id = ?', [id]))!;
  },

  async setDefaultAlbum(id: number | string, albumId: number | null): Promise<void> {
    const db = await getDb();
    await db.execute('UPDATE events SET default_album_id = ? WHERE id = ?', [albumId, id]);
  },

  async delete(id: number | string): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM events WHERE id = ?', [id]);
  },
};

// Re-export Album for consumers that imported it from here previously
export type { Album };
