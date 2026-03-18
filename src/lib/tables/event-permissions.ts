import type { DbAdapter } from '@/lib/db/adapter';
import getDb from '@/lib/db';
import type { User } from './users';

export const eventPermissionTable = {
  async create(adapter: DbAdapter): Promise<void> {
    if (adapter.dialect === 'mysql') {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS event_permissions (
          user_id INT NOT NULL,
          event_id INT NOT NULL,
          PRIMARY KEY (user_id, event_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    } else if (adapter.dialect === 'postgres') {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS event_permissions (
          user_id INT NOT NULL,
          event_id INT NOT NULL,
          PRIMARY KEY (user_id, event_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        )
      `);
    } else {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS event_permissions (
          user_id INTEGER NOT NULL,
          event_id INTEGER NOT NULL,
          PRIMARY KEY (user_id, event_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        )
      `);
    }
  },

  async insertOrIgnore(userId: number | string, eventId: number | string): Promise<number | bigint> {
    const db = await getDb();
    const sql = db.dialect === 'mysql'
      ? 'INSERT IGNORE INTO event_permissions (user_id, event_id) VALUES (?, ?)'
      : db.dialect === 'postgres'
        ? 'INSERT INTO event_permissions (user_id, event_id) VALUES (?, ?) ON CONFLICT DO NOTHING'
        : 'INSERT OR IGNORE INTO event_permissions (user_id, event_id) VALUES (?, ?)';
    const result = await db.execute(sql, [userId, eventId]);
    return result.lastInsertId;
  },

  /** Event IDs a user can manage */
  async getEventIdsForUser(userId: number | string): Promise<number[]> {
    const db = await getDb();
    return (await db.query<{ event_id: number }>(
      'SELECT event_id FROM event_permissions WHERE user_id = ?',
      [userId],
    )).map(r => r.event_id);
  },

  /** Users who can manage a given event */
  async getUsersForEvent(eventId: number | string): Promise<User[]> {
    const db = await getDb();
    return db.query<User>(`
      SELECT u.id, u.email, u.name, u.role, u.created_at
      FROM users u
      INNER JOIN event_permissions ep ON u.id = ep.user_id
      WHERE ep.event_id = ?
    `, [eventId]);
  },

  async hasPermission(userId: number | string, eventId: number | string): Promise<boolean> {
    const db = await getDb();
    return !!(await db.queryOne(
      'SELECT 1 FROM event_permissions WHERE user_id = ? AND event_id = ?',
      [userId, eventId],
    ));
  },

  /** Replace all event permissions for a user */
  async setForUser(userId: number | string, eventIds: number[]): Promise<void> {
    const db = await getDb();
    const insertSql = db.dialect === 'mysql'
      ? 'INSERT IGNORE INTO event_permissions (user_id, event_id) VALUES (?, ?)'
      : db.dialect === 'postgres'
        ? 'INSERT INTO event_permissions (user_id, event_id) VALUES (?, ?) ON CONFLICT DO NOTHING'
        : 'INSERT OR IGNORE INTO event_permissions (user_id, event_id) VALUES (?, ?)';
    await db.transaction(async tx => {
      await tx.execute('DELETE FROM event_permissions WHERE user_id = ?', [userId]);
      for (const eventId of eventIds) {
        await tx.execute(insertSql, [userId, eventId]);
      }
    });
  },

  /** Replace all user permissions for an event */
  async setForEvent(eventId: number | string, userIds: number[]): Promise<void> {
    const db = await getDb();
    const insertSql = db.dialect === 'mysql'
      ? 'INSERT IGNORE INTO event_permissions (event_id, user_id) VALUES (?, ?)'
      : db.dialect === 'postgres'
        ? 'INSERT INTO event_permissions (event_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING'
        : 'INSERT OR IGNORE INTO event_permissions (event_id, user_id) VALUES (?, ?)';
    await db.transaction(async tx => {
      await tx.execute('DELETE FROM event_permissions WHERE event_id = ?', [eventId]);
      for (const userId of userIds) {
        await tx.execute(insertSql, [eventId, userId]);
      }
    });
  },
};
