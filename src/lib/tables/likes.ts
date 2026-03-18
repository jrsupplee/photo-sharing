import type Database from 'better-sqlite3';
import getDb from '@/lib/db';

export const likeTable = {
  create(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        media_id INTEGER NOT NULL,
        session_id TEXT NOT NULL,
        UNIQUE(media_id, session_id),
        FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
      );
    `);
  },

  countByMediaId(mediaId: number | string): number {
    return (getDb().prepare('SELECT COUNT(*) as count FROM likes WHERE media_id = ?').get(mediaId) as { count: number }).count;
  },

  exists(mediaId: number | string, sessionId: string): boolean {
    return !!getDb().prepare('SELECT id FROM likes WHERE media_id = ? AND session_id = ?').get(mediaId, sessionId);
  },

  insert(mediaId: number | string, sessionId: string): void {
    getDb().prepare('INSERT INTO likes (media_id, session_id) VALUES (?, ?)').run(mediaId, sessionId);
  },

  delete(mediaId: number | string, sessionId: string): void {
    getDb().prepare('DELETE FROM likes WHERE media_id = ? AND session_id = ?').run(mediaId, sessionId);
  },
};
