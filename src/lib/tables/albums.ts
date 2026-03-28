import type { DbAdapter } from '@/lib/db/adapter';
import getDb from '@/lib/db';

export interface Album {
  id: number;
  event_id: number;
  name: string;
  order: number;
  read_only: number; // 0 or 1
}

export const albumTable = {
  async create(adapter: DbAdapter): Promise<void> {
    if (adapter.dialect === 'mysql') {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS albums (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_id INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          \`order\` INT DEFAULT 0,
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      // InnoDB auto-creates an index for the FK on event_id
      if (!(await adapter.columnExists('albums', 'read_only'))) {
        await adapter.exec('ALTER TABLE albums ADD COLUMN read_only TINYINT(1) NOT NULL DEFAULT 0');
      }
    } else if (adapter.dialect === 'postgres') {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS albums (
          id SERIAL PRIMARY KEY,
          event_id INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          "order" INT DEFAULT 0,
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        )
      `);
      await adapter.exec('CREATE INDEX IF NOT EXISTS idx_albums_event_id ON albums (event_id)');
      if (!(await adapter.columnExists('albums', 'read_only'))) {
        await adapter.exec('ALTER TABLE albums ADD COLUMN read_only SMALLINT NOT NULL DEFAULT 0');
      }
    } else {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS albums (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          "order" INTEGER DEFAULT 0,
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        )
      `);
      await adapter.exec('CREATE INDEX IF NOT EXISTS idx_albums_event_id ON albums (event_id)');
      if (!(await adapter.columnExists('albums', 'read_only'))) {
        await adapter.exec('ALTER TABLE albums ADD COLUMN read_only INTEGER NOT NULL DEFAULT 0');
      }
    }
  },

  async insert(album: { eventId: string | number; name: string; order: number; read_only?: boolean }): Promise<number | bigint> {
    const db = await getDb();
    const orderCol = db.dialect === 'mysql' ? '`order`' : '"order"';
    const result = await db.execute(
      `INSERT INTO albums (event_id, name, ${orderCol}, read_only) VALUES (?, ?, ?, ?)`,
      [album.eventId, album.name, album.order, album.read_only ? 1 : 0],
    );
    return result.lastInsertId;
  },

  async update(album: { id: string | number; name: string; order: number; read_only?: boolean }): Promise<void> {
    const db = await getDb();
    const orderCol = db.dialect === 'mysql' ? '`order`' : '"order"';
    await db.execute(
      `UPDATE albums SET name = ?, ${orderCol} = ?, read_only = ? WHERE id = ?`,
      [album.name, album.order, album.read_only ? 1 : 0, album.id],
    );
  },

  async setReadOnly(id: number | string, readOnly: boolean): Promise<void> {
    const db = await getDb();
    await db.execute('UPDATE albums SET read_only = ? WHERE id = ?', [readOnly ? 1 : 0, id]);
  },

  async findById(id: number | string): Promise<Album | undefined> {
    const db = await getDb();
    return db.queryOne<Album>('SELECT * FROM albums WHERE id = ?', [id]);
  },

  async findByEventId(eventId: number | string): Promise<Album[]> {
    const db = await getDb();
    const orderCol = db.dialect === 'mysql' ? '`order`' : '"order"';
    return db.query<Album>(
      `SELECT * FROM albums WHERE event_id = ? ORDER BY ${orderCol} ASC`,
      [eventId],
    );
  },

  async updateForEvent(
    eventId: number | string,
    albums: { id: number; name: string; order: number; read_only?: boolean }[],
  ): Promise<void> {
    const db = await getDb();
    const orderCol = db.dialect === 'mysql' ? '`order`' : '"order"';
    const existing = await db.query<{ id: number }>('SELECT id FROM albums WHERE event_id = ?', [eventId]);
    const existingIds = new Set(existing.map(r => r.id));
    const incomingIds = new Set(albums.filter(a => a.id > 0).map(a => a.id));

    await db.transaction(async tx => {
      for (const existingId of existingIds) {
        if (!incomingIds.has(existingId)) {
          await tx.execute('DELETE FROM albums WHERE id = ?', [existingId]);
        }
      }
      for (const album of albums) {
        if (album.id > 0 && existingIds.has(album.id)) {
          await tx.execute(
            `UPDATE albums SET name = ?, ${orderCol} = ?, read_only = ? WHERE id = ?`,
            [album.name, album.order, album.read_only ? 1 : 0, album.id],
          );
        } else {
          await tx.execute(
            `INSERT INTO albums (event_id, name, ${orderCol}, read_only) VALUES (?, ?, ?, ?)`,
            [eventId, album.name, album.order, album.read_only ? 1 : 0],
          );
        }
      }
    });
  },
};
