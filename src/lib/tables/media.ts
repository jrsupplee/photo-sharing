import type { DbAdapter } from '@/lib/db/adapter';
import getDb from '@/lib/db';

export interface Media {
  id: number;
  event_id: number;
  album_id: number | null;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  caption: string | null;
  uploader_name: string | null;
  session_id: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  storage_key: string;
  thumbnail_key: string | null;
  medium_key: string | null;
  created_at: string;
  // joined fields
  album_name?: string;
  like_count?: number;
  comment_count?: number;
  user_liked?: number;
}

export const mediaTable = {
  async create(adapter: DbAdapter): Promise<void> {
    if (adapter.dialect === 'mysql') {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS media (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_id INT NOT NULL,
          album_id INT,
          filename VARCHAR(512) NOT NULL,
          original_name VARCHAR(512) NOT NULL,
          mime_type VARCHAR(255) NOT NULL,
          size INT NOT NULL,
          caption TEXT,
          uploader_name VARCHAR(255),
          session_id VARCHAR(255),
          storage_key VARCHAR(512) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
          FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      const mysqlCols: Record<string, string> = {
        thumbnail_key: 'VARCHAR(512)',
        medium_key: 'VARCHAR(512)',
        deleted_at: 'DATETIME',
        deleted_by: 'VARCHAR(255)',
        file_hash: 'VARCHAR(64)',
      };
      for (const [col, type] of Object.entries(mysqlCols)) {
        if (!(await adapter.columnExists('media', col))) {
          await adapter.exec(`ALTER TABLE media ADD COLUMN ${col} ${type}`);
        }
      }
    } else if (adapter.dialect === 'postgres') {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS media (
          id SERIAL PRIMARY KEY,
          event_id INT NOT NULL,
          album_id INT,
          filename VARCHAR(512) NOT NULL,
          original_name VARCHAR(512) NOT NULL,
          mime_type VARCHAR(255) NOT NULL,
          size INT NOT NULL,
          caption TEXT,
          uploader_name VARCHAR(255),
          session_id VARCHAR(255),
          storage_key VARCHAR(512) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
          FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE SET NULL
        )
      `);
      const pgCols: Record<string, string> = {
        thumbnail_key: 'VARCHAR(512)',
        medium_key: 'VARCHAR(512)',
        deleted_at: 'TIMESTAMP',
        deleted_by: 'VARCHAR(255)',
        file_hash: 'VARCHAR(64)',
      };
      for (const [col, type] of Object.entries(pgCols)) {
        if (!(await adapter.columnExists('media', col))) {
          await adapter.exec(`ALTER TABLE media ADD COLUMN ${col} ${type}`);
        }
      }
    } else {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS media (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL,
          album_id INTEGER,
          filename TEXT NOT NULL,
          original_name TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          size INTEGER NOT NULL,
          caption TEXT,
          uploader_name TEXT,
          session_id TEXT,
          storage_key TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
          FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE SET NULL
        )
      `);
      for (const col of ['thumbnail_key', 'medium_key', 'session_id', 'deleted_at', 'deleted_by', 'file_hash']) {
        if (!(await adapter.columnExists('media', col))) {
          await adapter.exec(`ALTER TABLE media ADD COLUMN ${col} TEXT`);
        }
      }
    }
  },

  async findById(id: number | string): Promise<Media | undefined> {
    const db = await getDb();
    return db.queryOne<Media>('SELECT * FROM media WHERE id = ?', [id]);
  },

  /** For admin event management — includes like/comment counts, no user_liked */
  async findByEventId(eventId: number | string): Promise<Media[]> {
    const db = await getDb();
    return db.query<Media>(`
      SELECT m.*, a.name as album_name,
        (SELECT COUNT(*) FROM likes l WHERE l.media_id = m.id) as like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.media_id = m.id) as comment_count
      FROM media m
      LEFT JOIN albums a ON m.album_id = a.id
      WHERE m.event_id = ? AND m.deleted_at IS NULL
      ORDER BY m.created_at DESC
    `, [eventId]);
  },

  /** Soft-deleted items for a given event — admin only */
  async findDeletedByEventId(eventId: number | string): Promise<Media[]> {
    const db = await getDb();
    return db.query<Media>(`
      SELECT m.*, a.name as album_name
      FROM media m
      LEFT JOIN albums a ON m.album_id = a.id
      WHERE m.event_id = ? AND m.deleted_at IS NOT NULL
      ORDER BY m.deleted_at DESC
    `, [eventId]);
  },

  /** For public gallery — includes user_liked. sessionId is the first bind param. */
  async findByEventIdForGallery(
    eventId: number | string,
    sessionId: string,
    albumId?: number | null,
  ): Promise<Media[]> {
    const db = await getDb();
    let query = `
      SELECT m.*, a.name as album_name,
        (SELECT COUNT(*) FROM likes l WHERE l.media_id = m.id) as like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.media_id = m.id) as comment_count,
        (SELECT COUNT(*) FROM likes l WHERE l.media_id = m.id AND l.session_id = ?) as user_liked
      FROM media m
      LEFT JOIN albums a ON m.album_id = a.id
      WHERE m.event_id = ? AND m.deleted_at IS NULL
    `;
    const params: unknown[] = [sessionId, eventId];
    if (albumId != null) {
      query += ' AND m.album_id = ?';
      params.push(albumId);
    }
    query += ' ORDER BY m.created_at DESC';
    return db.query<Media>(query, params);
  },

  /** For the media API endpoint — looks up by event slug, includes like/comment counts */
  async findByEventSlug(slug: string): Promise<Media[]> {
    const db = await getDb();
    return db.query<Media>(`
      SELECT m.*, a.name as album_name,
        (SELECT COUNT(*) FROM likes l WHERE l.media_id = m.id) as like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.media_id = m.id) as comment_count
      FROM media m
      LEFT JOIN albums a ON m.album_id = a.id
      INNER JOIN events e ON m.event_id = e.id
      WHERE e.slug = ? AND m.deleted_at IS NULL
      ORDER BY m.created_at DESC
    `, [slug]);
  },

  /** Storage keys for all media in an event — used before deleting an event */
  async getStorageKeysByEventId(eventId: number | string): Promise<string[]> {
    const db = await getDb();
    return (await db.query<{ storage_key: string }>(
      'SELECT storage_key FROM media WHERE event_id = ?',
      [eventId],
    )).map(r => r.storage_key);
  },

  /** Images with missing thumbnail/medium variants — for backfill */
  async findMissingVariants(): Promise<{ id: number; storage_key: string; mime_type: string }[]> {
    const db = await getDb();
    return db.query<{ id: number; storage_key: string; mime_type: string }>(`
      SELECT id, storage_key, mime_type FROM media
      WHERE mime_type LIKE 'image/%' AND (thumbnail_key IS NULL OR medium_key IS NULL) AND deleted_at IS NULL
    `);
  },

  async countImages(): Promise<number> {
    const db = await getDb();
    const row = await db.queryOne<{ n: number }>(
      `SELECT COUNT(*) as n FROM media WHERE mime_type LIKE 'image/%' AND deleted_at IS NULL`,
    );
    return Number(row!.n);
  },

  async countMissingVariants(): Promise<number> {
    const db = await getDb();
    const row = await db.queryOne<{ n: number }>(`
      SELECT COUNT(*) as n FROM media
      WHERE mime_type LIKE 'image/%' AND (thumbnail_key IS NULL OR medium_key IS NULL) AND deleted_at IS NULL
    `);
    return Number(row!.n);
  },

  async findByHash(eventId: number | string, fileHash: string): Promise<Media | undefined> {
    const db = await getDb();
    return db.queryOne<Media>(
      'SELECT * FROM media WHERE event_id = ? AND file_hash = ? LIMIT 1',
      [eventId, fileHash],
    );
  },

  async insert(fields: {
    event_id: number;
    album_id: number | null;
    filename: string;
    original_name: string;
    mime_type: string;
    size: number;
    caption: string | null;
    uploader_name: string | null;
    session_id: string | null;
    storage_key: string;
    thumbnail_key: string | null;
    medium_key: string | null;
    file_hash: string | null;
  }): Promise<Media> {
    const db = await getDb();
    const result = await db.execute(`
      INSERT INTO media (event_id, album_id, filename, original_name, mime_type, size, caption, uploader_name, session_id, storage_key, thumbnail_key, medium_key, file_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      fields.event_id, fields.album_id, fields.filename, fields.original_name,
      fields.mime_type, fields.size, fields.caption, fields.uploader_name,
      fields.session_id, fields.storage_key, fields.thumbnail_key, fields.medium_key, fields.file_hash,
    ]);
    return (await db.queryOne<Media>('SELECT * FROM media WHERE id = ?', [result.lastInsertId]))!;
  },

  async update(id: number | string, uploaderName: string | null, caption: string | null): Promise<Media> {
    const db = await getDb();
    await db.execute(
      'UPDATE media SET uploader_name = ?, caption = ? WHERE id = ?',
      [uploaderName, caption, id],
    );
    return (await db.queryOne<Media>('SELECT * FROM media WHERE id = ?', [id]))!;
  },

  async updateVariants(id: number, thumbnailKey: string, mediumKey: string): Promise<void> {
    const db = await getDb();
    await db.execute(
      'UPDATE media SET thumbnail_key = ?, medium_key = ? WHERE id = ?',
      [thumbnailKey, mediumKey, id],
    );
  },

  async softDelete(id: number | string, deletedBy: string | null): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.execute(
      'UPDATE media SET deleted_at = ?, deleted_by = ? WHERE id = ?',
      [now, deletedBy, id],
    );
  },

  async restore(id: number | string, fields?: { uploader_name?: string | null; caption?: string | null }): Promise<void> {
    const db = await getDb();
    if (fields) {
      await db.execute(
        'UPDATE media SET deleted_at = NULL, deleted_by = NULL, uploader_name = ?, caption = ? WHERE id = ?',
        [fields.uploader_name ?? null, fields.caption ?? null, id],
      );
    } else {
      await db.execute('UPDATE media SET deleted_at = NULL, deleted_by = NULL WHERE id = ?', [id]);
    }
  },

  async delete(id: number | string): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM media WHERE id = ?', [id]);
  },
};
