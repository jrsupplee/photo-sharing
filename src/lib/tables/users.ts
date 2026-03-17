import type Database from 'better-sqlite3';
import getDb from '@/lib/db';
import { User } from '@/types';
import bcrypt from 'bcryptjs';

export function createTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'event_manager',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  const cols = (db.prepare('PRAGMA table_info(users)').all() as { name: string }[]).map(c => c.name);
  if (!cols.includes('session_id')) db.exec('ALTER TABLE users ADD COLUMN session_id TEXT');
}

export function seedAdminIfNeeded(db: Database.Database): void {
  const userCount = (db.prepare('SELECT COUNT(*) as n FROM users').get() as { n: number }).n;
  if (userCount === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
    db.prepare(`INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, 'admin')`)
      .run(process.env.ADMIN_EMAIL, 'Admin', hash);
  }
}

export const userTable = {
  findById(id: number | string): User | undefined {
    return getDb().prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(id) as User | undefined;
  },

  findByEmail(email: string): (User & { password_hash: string; session_id: string | null }) | undefined {
    return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email) as (User & { password_hash: string; session_id: string | null }) | undefined;
  },

  setSessionId(id: number | string, sessionId: string): void {
    getDb().prepare('UPDATE users SET session_id = ? WHERE id = ?').run(sessionId, id);
  },

  list(): User[] {
    return getDb().prepare('SELECT id, email, name, role, created_at FROM users ORDER BY created_at ASC').all() as User[];
  },

  insert(email: string, name: string, password: string, role: 'admin' | 'event_manager'): User {
    const db = getDb();
    const password_hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)').run(email, name, password_hash, role);
    return db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid) as User;
  },

  update(id: number | string, fields: { email?: string; name?: string; password?: string; role?: 'admin' | 'event_manager' }): User {
    const db = getDb();
    if (fields.name !== undefined) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(fields.name, id);
    if (fields.email !== undefined) db.prepare('UPDATE users SET email = ? WHERE id = ?').run(fields.email, id);
    if (fields.role !== undefined) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(fields.role, id);
    if (fields.password !== undefined) {
      const hash = bcrypt.hashSync(fields.password, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
    }
    return db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(id) as User;
  },

  delete(id: number | string): void {
    getDb().prepare('DELETE FROM users WHERE id = ?').run(id);
  },
};
