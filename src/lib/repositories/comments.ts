import getDb from '@/lib/db';
import { Comment } from '@/types';

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
