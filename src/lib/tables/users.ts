import type { DbAdapter } from '@/lib/db/adapter';
import getDb from '@/lib/db';
import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'event_manager';
  created_at: string;
}

export async function seedAdminIfNeeded(adapter: DbAdapter): Promise<void> {
  const row = await adapter.queryOne<{ n: number }>('SELECT COUNT(*) as n FROM users');
  if (Number(row!.n) === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
    await adapter.execute(
      `INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, 'admin')`,
      [process.env.ADMIN_EMAIL, 'Admin', hash],
    );
  }
}

export const userTable = {
  async create(adapter: DbAdapter): Promise<void> {
    if (adapter.dialect === 'mysql') {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          password_hash TEXT NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'event_manager',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      if (!(await adapter.columnExists('users', 'session_id'))) {
        await adapter.exec('ALTER TABLE users ADD COLUMN session_id VARCHAR(255)');
      }
    } else {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'event_manager',
          created_at TEXT DEFAULT (datetime('now'))
        )
      `);
      if (!(await adapter.columnExists('users', 'session_id'))) {
        await adapter.exec('ALTER TABLE users ADD COLUMN session_id TEXT');
      }
    }
  },

  async findById(id: number | string): Promise<User | undefined> {
    const db = await getDb();
    return db.queryOne<User>('SELECT id, email, name, role, created_at FROM users WHERE id = ?', [id]);
  },

  async findByEmail(email: string): Promise<(User & { password_hash: string; session_id: string | null }) | undefined> {
    const db = await getDb();
    return db.queryOne<User & { password_hash: string; session_id: string | null }>(
      'SELECT * FROM users WHERE email = ?',
      [email],
    );
  },

  async setSessionId(id: number | string, sessionId: string): Promise<void> {
    const db = await getDb();
    await db.execute('UPDATE users SET session_id = ? WHERE id = ?', [sessionId, id]);
  },

  async list(): Promise<User[]> {
    const db = await getDb();
    return db.query<User>('SELECT id, email, name, role, created_at FROM users ORDER BY created_at ASC');
  },

  async insert(email: string, name: string, password: string, role: 'admin' | 'event_manager'): Promise<User> {
    const db = await getDb();
    const password_hash = bcrypt.hashSync(password, 10);
    const result = await db.execute(
      'INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)',
      [email, name, password_hash, role],
    );
    return (await db.queryOne<User>(
      'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
      [result.lastInsertId],
    ))!;
  },

  async update(
    id: number | string,
    fields: { email?: string; name?: string; password?: string; role?: 'admin' | 'event_manager' },
  ): Promise<User> {
    const db = await getDb();
    if (fields.name !== undefined) await db.execute('UPDATE users SET name = ? WHERE id = ?', [fields.name, id]);
    if (fields.email !== undefined) await db.execute('UPDATE users SET email = ? WHERE id = ?', [fields.email, id]);
    if (fields.role !== undefined) await db.execute('UPDATE users SET role = ? WHERE id = ?', [fields.role, id]);
    if (fields.password !== undefined) {
      const hash = bcrypt.hashSync(fields.password, 10);
      await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
    }
    return (await db.queryOne<User>(
      'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
      [id],
    ))!;
  },

  async delete(id: number | string): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM users WHERE id = ?', [id]);
  },
};
