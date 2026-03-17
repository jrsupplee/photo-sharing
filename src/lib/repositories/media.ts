import type Database from 'better-sqlite3';
import getDb from '@/lib/db';
import { Media } from '@/types';

export function createTable(db: Database.Database): void {
  db.exec(`
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
    );
  `);
  const cols = (db.prepare('PRAGMA table_info(media)').all() as { name: string }[]).map(c => c.name);
  if (!cols.includes('thumbnail_key')) db.exec('ALTER TABLE media ADD COLUMN thumbnail_key TEXT');
  if (!cols.includes('medium_key'))    db.exec('ALTER TABLE media ADD COLUMN medium_key TEXT');
  if (!cols.includes('session_id'))    db.exec('ALTER TABLE media ADD COLUMN session_id TEXT');
  if (!cols.includes('deleted_at'))    db.exec('ALTER TABLE media ADD COLUMN deleted_at TEXT');
  if (!cols.includes('deleted_by'))    db.exec('ALTER TABLE media ADD COLUMN deleted_by TEXT');
  if (!cols.includes('file_hash'))     db.exec('ALTER TABLE media ADD COLUMN file_hash TEXT');
}

export const mediaRepo = {
  findById(id: number | string): Media | undefined {
    return getDb().prepare('SELECT * FROM media WHERE id = ?').get(id) as Media | undefined;
  },

  /** For admin event management — includes like/comment counts, no user_liked */
  findByEventId(eventId: number | string): Media[] {
    return getDb().prepare(`
      SELECT m.*, a.name as album_name,
        (SELECT COUNT(*) FROM likes l WHERE l.media_id = m.id) as like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.media_id = m.id) as comment_count
      FROM media m
      LEFT JOIN albums a ON m.album_id = a.id
      WHERE m.event_id = ? AND m.deleted_at IS NULL
      ORDER BY m.created_at DESC
    `).all(eventId) as Media[];
  },

  /** Soft-deleted items for a given event — admin only */
  findDeletedByEventId(eventId: number | string): Media[] {
    return getDb().prepare(`
      SELECT m.*, a.name as album_name
      FROM media m
      LEFT JOIN albums a ON m.album_id = a.id
      WHERE m.event_id = ? AND m.deleted_at IS NOT NULL
      ORDER BY m.deleted_at DESC
    `).all(eventId) as Media[];
  },

  /** For public gallery — includes user_liked. sessionId is the first bind param. */
  findByEventIdForGallery(eventId: number | string, sessionId: string, albumId?: number | null): Media[] {
    const db = getDb();
    let query = `
      SELECT m.*, a.name as album_name,
        (SELECT COUNT(*) FROM likes l WHERE l.media_id = m.id) as like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.media_id = m.id) as comment_count,
        (SELECT COUNT(*) FROM likes l WHERE l.media_id = m.id AND l.session_id = ?) as user_liked
      FROM media m
      LEFT JOIN albums a ON m.album_id = a.id
      WHERE m.event_id = ? AND m.deleted_at IS NULL
    `;
    const params: (string | number)[] = [sessionId, eventId as number | string];
    if (albumId != null) {
      query += ' AND m.album_id = ?';
      params.push(albumId);
    }
    query += ' ORDER BY m.created_at DESC';
    return db.prepare(query).all(...params) as Media[];
  },

  /** For the media API endpoint — looks up by event slug, includes like/comment counts */
  findByEventSlug(slug: string): Media[] {
    return getDb().prepare(`
      SELECT m.*, a.name as album_name,
        (SELECT COUNT(*) FROM likes l WHERE l.media_id = m.id) as like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.media_id = m.id) as comment_count
      FROM media m
      LEFT JOIN albums a ON m.album_id = a.id
      INNER JOIN events e ON m.event_id = e.id
      WHERE e.slug = ? AND m.deleted_at IS NULL
      ORDER BY m.created_at DESC
    `).all(slug) as Media[];
  },

  /** Storage keys for all media in an event — used before deleting an event */
  getStorageKeysByEventId(eventId: number | string): string[] {
    return (getDb().prepare('SELECT storage_key FROM media WHERE event_id = ?').all(eventId) as { storage_key: string }[])
      .map(r => r.storage_key);
  },

  /** Images with missing thumbnail/medium variants — for backfill */
  findMissingVariants(): { id: number; storage_key: string; mime_type: string }[] {
    return getDb().prepare(`
      SELECT id, storage_key, mime_type FROM media
      WHERE mime_type LIKE 'image/%' AND (thumbnail_key IS NULL OR medium_key IS NULL) AND deleted_at IS NULL
    `).all() as { id: number; storage_key: string; mime_type: string }[];
  },

  countImages(): number {
    return (getDb().prepare(`SELECT COUNT(*) as n FROM media WHERE mime_type LIKE 'image/%' AND deleted_at IS NULL`).get() as { n: number }).n;
  },

  countMissingVariants(): number {
    return (getDb().prepare(`
      SELECT COUNT(*) as n FROM media WHERE mime_type LIKE 'image/%' AND (thumbnail_key IS NULL OR medium_key IS NULL) AND deleted_at IS NULL
    `).get() as { n: number }).n;
  },

  findByHash(eventId: number | string, fileHash: string): Media | undefined {
    return getDb().prepare(
      'SELECT * FROM media WHERE event_id = ? AND file_hash = ? LIMIT 1'
    ).get(eventId, fileHash) as Media | undefined;
  },

  create(fields: {
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
  }): Media {
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO media (event_id, album_id, filename, original_name, mime_type, size, caption, uploader_name, session_id, storage_key, thumbnail_key, medium_key, file_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      fields.event_id, fields.album_id, fields.filename, fields.original_name,
      fields.mime_type, fields.size, fields.caption, fields.uploader_name,
      fields.session_id, fields.storage_key, fields.thumbnail_key, fields.medium_key, fields.file_hash,
    );
    return db.prepare('SELECT * FROM media WHERE id = ?').get(result.lastInsertRowid) as Media;
  },

  update(id: number | string, uploaderName: string | null, caption: string | null): Media {
    const db = getDb();
    db.prepare('UPDATE media SET uploader_name = ?, caption = ? WHERE id = ?').run(uploaderName, caption, id);
    return db.prepare('SELECT * FROM media WHERE id = ?').get(id) as Media;
  },

  updateVariants(id: number, thumbnailKey: string, mediumKey: string): void {
    getDb().prepare('UPDATE media SET thumbnail_key = ?, medium_key = ? WHERE id = ?').run(thumbnailKey, mediumKey, id);
  },

  softDelete(id: number | string, deletedBy: string | null): void {
    getDb().prepare(`UPDATE media SET deleted_at = datetime('now'), deleted_by = ? WHERE id = ?`).run(deletedBy, id);
  },

  restore(id: number | string, fields?: { uploader_name?: string | null; caption?: string | null }): void {
    if (fields) {
      getDb().prepare('UPDATE media SET deleted_at = NULL, deleted_by = NULL, uploader_name = ?, caption = ? WHERE id = ?')
        .run(fields.uploader_name ?? null, fields.caption ?? null, id);
    } else {
      getDb().prepare('UPDATE media SET deleted_at = NULL, deleted_by = NULL WHERE id = ?').run(id);
    }
  },

  delete(id: number | string): void {
    getDb().prepare('DELETE FROM media WHERE id = ?').run(id);
  },
};
