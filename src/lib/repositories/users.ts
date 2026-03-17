import getDb from '@/lib/db';
import { User } from '@/types';
import bcrypt from 'bcryptjs';

export const userRepo = {
  findById(id: number | string): User | undefined {
    return getDb().prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(id) as User | undefined;
  },

  findByEmail(email: string): (User & { password_hash: string }) | undefined {
    return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email) as (User & { password_hash: string }) | undefined;
  },

  list(): User[] {
    return getDb().prepare('SELECT id, email, name, role, created_at FROM users ORDER BY created_at ASC').all() as User[];
  },

  create(email: string, name: string, password: string, role: 'admin' | 'event_manager'): User {
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
