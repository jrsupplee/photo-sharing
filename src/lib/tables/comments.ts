import type { DbAdapter } from '@/lib/db/adapter';
import getDb from '@/lib/db';

export interface Comment {
  id: number;
  media_id: number;
  author_name: string;
  body: string;
  session_id: string | null;
  created_at: string;
}

export const commentTable = {
  async create(adapter: DbAdapter): Promise<void> {
    if (adapter.dialect === 'mysql') {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS comments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          media_id INT NOT NULL,
          author_name VARCHAR(255) NOT NULL,
          body TEXT NOT NULL,
          session_id VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    } else {
      await adapter.exec(`
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
      if (!(await adapter.columnExists('comments', 'session_id'))) {
        await adapter.exec('ALTER TABLE comments ADD COLUMN session_id TEXT');
      }
    }
  },

  async findByMediaId(mediaId: number | string): Promise<Comment[]> {
    const db = await getDb();
    return db.query<Comment>(
      'SELECT * FROM comments WHERE media_id = ? ORDER BY created_at ASC',
      [mediaId],
    );
  },

  async findById(id: number | bigint): Promise<Comment | undefined> {
    const db = await getDb();
    return db.queryOne<Comment>('SELECT * FROM comments WHERE id = ?', [id]);
  },

  async insert(
    mediaId: number | string,
    authorName: string,
    body: string,
    sessionId: string | null,
  ): Promise<Comment> {
    const db = await getDb();
    const result = await db.execute(
      'INSERT INTO comments (media_id, author_name, body, session_id) VALUES (?, ?, ?, ?)',
      [mediaId, authorName, body, sessionId],
    );
    return (await db.queryOne<Comment>('SELECT * FROM comments WHERE id = ?', [result.lastInsertId]))!;
  },
};
