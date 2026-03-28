import type { DbAdapter } from '@/lib/db/adapter';
import getDb from '@/lib/db';

export interface Session {
  session_id: string;
  event_id: number;
  name: string;
}

export const sessionTable = {
  async create(adapter: DbAdapter): Promise<void> {
    if (adapter.dialect === 'mysql') {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          session_id VARCHAR(255) NOT NULL,
          event_id INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          UNIQUE KEY uq_session_event (session_id, event_id),
          INDEX idx_sessions_session_id (session_id),
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    } else if (adapter.dialect === 'postgres') {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          session_id VARCHAR(255) NOT NULL,
          event_id INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          UNIQUE (session_id, event_id),
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        )
      `);
      await adapter.exec(
        `CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions (session_id)`,
      );
    } else {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          session_id TEXT NOT NULL,
          event_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          UNIQUE(session_id, event_id),
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        )
      `);
      await adapter.exec(
        `CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions (session_id)`,
      );
    }
  },

  async upsert(sessionId: string, eventId: number, name: string): Promise<void> {
    const db = await getDb();
    if (db.dialect === 'mysql') {
      await db.execute(
        `INSERT INTO sessions (session_id, event_id, name) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        [sessionId, eventId, name],
      );
    } else if (db.dialect === 'postgres') {
      await db.execute(
        `INSERT INTO sessions (session_id, event_id, name) VALUES (?, ?, ?)
         ON CONFLICT (session_id, event_id) DO UPDATE SET name = EXCLUDED.name`,
        [sessionId, eventId, name],
      );
    } else {
      await db.execute(
        `INSERT OR REPLACE INTO sessions (session_id, event_id, name) VALUES (?, ?, ?)`,
        [sessionId, eventId, name],
      );
    }
  },
};
