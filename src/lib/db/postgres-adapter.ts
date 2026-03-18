import { Pool, PoolClient, types } from 'pg';
import type { DbAdapter } from './adapter';

// Return TIMESTAMP and TIMESTAMPTZ columns as strings instead of Date objects,
// consistent with how SQLite and MySQL return date values.
types.setTypeParser(1114, (val: string) => val); // TIMESTAMP
types.setTypeParser(1184, (val: string) => val); // TIMESTAMPTZ

export class PostgresAdapter implements DbAdapter {
  readonly dialect = 'postgres' as const;

  constructor(private pool: Pool) {}

  private rewritePlaceholders(sql: string): string {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.pool.query(this.rewritePlaceholders(sql), params);
    return result.rows as T[];
  }

  async queryOne<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const result = await this.pool.query(this.rewritePlaceholders(sql), params);
    return result.rows[0] as T | undefined;
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ lastInsertId: number | bigint }> {
    const isInsert = sql.trimStart().toUpperCase().startsWith('INSERT');
    const pgSql = this.rewritePlaceholders(isInsert ? `${sql} RETURNING id` : sql);
    const result = await this.pool.query(pgSql, params);
    return { lastInsertId: isInsert ? (result.rows[0]?.id ?? 0) : 0 };
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async columnExists(table: string, column: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
      [table, column],
    );
    return result.rows.length > 0;
  }

  async transaction<T>(fn: (tx: DbAdapter) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    const txAdapter = new PostgresClientAdapter(client);
    try {
      const result = await fn(txAdapter);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

class PostgresClientAdapter implements DbAdapter {
  readonly dialect = 'postgres' as const;

  constructor(private client: PoolClient) {}

  private rewritePlaceholders(sql: string): string {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.client.query(this.rewritePlaceholders(sql), params);
    return result.rows as T[];
  }

  async queryOne<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const result = await this.client.query(this.rewritePlaceholders(sql), params);
    return result.rows[0] as T | undefined;
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ lastInsertId: number | bigint }> {
    const isInsert = sql.trimStart().toUpperCase().startsWith('INSERT');
    const pgSql = this.rewritePlaceholders(isInsert ? `${sql} RETURNING id` : sql);
    const result = await this.client.query(pgSql, params);
    return { lastInsertId: isInsert ? (result.rows[0]?.id ?? 0) : 0 };
  }

  async exec(sql: string): Promise<void> {
    await this.client.query(sql);
  }

  async columnExists(table: string, column: string): Promise<boolean> {
    const result = await this.client.query(
      'SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
      [table, column],
    );
    return result.rows.length > 0;
  }

  async transaction<T>(fn: (tx: DbAdapter) => Promise<T>): Promise<T> {
    // Already in a transaction; run fn on the same client
    return fn(this);
  }
}
