import type Database from 'better-sqlite3';
import getDb from '@/lib/db';
import { Comment } from '@/types';

export function initCommentsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      body TEXT NOT NULL,
      session_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
    )
  `);

  const cols = db.prepare('PRAGMA table_info(comments)').all() as { name: string }[];
  if (!cols.map(c => c.name).includes('session_id')) db.exec('ALTER TABLE comments ADD COLUMN session_id TEXT');
}

export const commentRepo = {
  findByMediaId(mediaId: number | string): Comment[] {
    return getDb().prepare('SELECT * FROM comments WHERE media_id = ? ORDER BY created_at ASC').all(mediaId) as Comment[];
  },

  findById(id: number | bigint): Comment | undefined {
    return getDb().prepare('SELECT * FROM comments WHERE id = ?').get(id) as Comment | undefined;
  },

  create(mediaId: number | string, authorName: string, body: string, sessionId: string | null): Comment {
    const db = getDb();
    const result = db.prepare('INSERT INTO comments (media_id, author_name, body, session_id) VALUES (?, ?, ?, ?)')
      .run(mediaId, authorName, body, sessionId);
    return db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid) as Comment;
  },
};
