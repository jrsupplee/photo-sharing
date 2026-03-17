import getDb from '@/lib/db';

export const likeRepo = {
  countByMediaId(mediaId: number | string): number {
    return (getDb().prepare('SELECT COUNT(*) as count FROM likes WHERE media_id = ?').get(mediaId) as { count: number }).count;
  },

  exists(mediaId: number | string, sessionId: string): boolean {
    return !!getDb().prepare('SELECT id FROM likes WHERE media_id = ? AND session_id = ?').get(mediaId, sessionId);
  },

  create(mediaId: number | string, sessionId: string): void {
    getDb().prepare('INSERT INTO likes (media_id, session_id) VALUES (?, ?)').run(mediaId, sessionId);
  },

  delete(mediaId: number | string, sessionId: string): void {
    getDb().prepare('DELETE FROM likes WHERE media_id = ? AND session_id = ?').run(mediaId, sessionId);
  },
};
