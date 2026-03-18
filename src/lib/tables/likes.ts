import type { DbAdapter } from '@/lib/db/adapter';
import getDb from '@/lib/db';

export interface Like {
  id: number;
  media_id: number;
  session_id: string;
}

export const likeTable = {
  async create(adapter: DbAdapter): Promise<void> {
    if (adapter.dialect === 'mysql') {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS likes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          media_id INT NOT NULL,
          session_id VARCHAR(255) NOT NULL,
          UNIQUE KEY uq_like (media_id, session_id),
          FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    } else if (adapter.dialect === 'postgres') {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS likes (
          id SERIAL PRIMARY KEY,
          media_id INT NOT NULL,
          session_id VARCHAR(255) NOT NULL,
          UNIQUE (media_id, session_id),
          FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
        )
      `);
    } else {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS likes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          media_id INTEGER NOT NULL,
          session_id TEXT NOT NULL,
          UNIQUE(media_id, session_id),
          FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
        )
      `);
    }
  },

  async countByMediaId(mediaId: number | string): Promise<number> {
    const db = await getDb();
    const row = await db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM likes WHERE media_id = ?',
      [mediaId],
    );
    return Number(row!.count);
  },

  async exists(mediaId: number | string, sessionId: string): Promise<boolean> {
    const db = await getDb();
    return !!(await db.queryOne(
      'SELECT id FROM likes WHERE media_id = ? AND session_id = ?',
      [mediaId, sessionId],
    ));
  },

  async insert(mediaId: number | string, sessionId: string): Promise<void> {
    const db = await getDb();
    await db.execute('INSERT INTO likes (media_id, session_id) VALUES (?, ?)', [mediaId, sessionId]);
  },

  async delete(mediaId: number | string, sessionId: string): Promise<void> {
    const db = await getDb();
    await db.execute(
      'DELETE FROM likes WHERE media_id = ? AND session_id = ?',
      [mediaId, sessionId],
    );
  },
};
