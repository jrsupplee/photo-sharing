import Database from 'better-sqlite3';
import type { DbAdapter } from './adapter';

export class SqliteAdapter implements DbAdapter {
  readonly dialect = 'sqlite' as const;

  constructor(private db: Database.Database) {}

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...(params as Parameters<typeof this.db.prepare>)) as T[];
  }

  async queryOne<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return this.db.prepare(sql).get(...(params as Parameters<typeof this.db.prepare>)) as T | undefined;
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ lastInsertId: number | bigint }> {
    const result = this.db.prepare(sql).run(...(params as Parameters<typeof this.db.prepare>));
    return { lastInsertId: result.lastInsertRowid };
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async columnExists(table: string, column: string): Promise<boolean> {
    const cols = (this.db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(c => c.name);
    return cols.includes(column);
  }

  async transaction<T>(fn: (tx: DbAdapter) => Promise<T>): Promise<T> {
    this.db.exec('BEGIN');
    try {
      const result = await fn(this);
      this.db.exec('COMMIT');
      return result;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
}
