import mysql from 'mysql2/promise';
import type { DbAdapter } from './adapter';

export class MySqlAdapter implements DbAdapter {
  readonly dialect = 'mysql' as const;

  constructor(private pool: mysql.Pool) {}

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const [rows] = await this.pool.query(sql, params);
    return rows as T[];
  }

  async queryOne<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const [rows] = await this.pool.query(sql, params);
    return (rows as T[])[0];
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ lastInsertId: number | bigint }> {
    const [result] = await this.pool.query(sql, params) as [mysql.ResultSetHeader, mysql.FieldPacket[]];
    return { lastInsertId: result.insertId };
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async columnExists(table: string, column: string): Promise<boolean> {
    const [rows] = await this.pool.query(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [table, column],
    ) as [mysql.RowDataPacket[], mysql.FieldPacket[]];
    return rows.length > 0;
  }

  async transaction<T>(fn: (tx: DbAdapter) => Promise<T>): Promise<T> {
    const conn = await this.pool.getConnection();
    await conn.beginTransaction();
    const txAdapter = new MySqlConnectionAdapter(conn);
    try {
      const result = await fn(txAdapter);
      await conn.commit();
      return result;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
}

class MySqlConnectionAdapter implements DbAdapter {
  readonly dialect = 'mysql' as const;

  constructor(private conn: mysql.PoolConnection) {}

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const [rows] = await this.conn.query(sql, params);
    return rows as T[];
  }

  async queryOne<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const [rows] = await this.conn.query(sql, params);
    return (rows as T[])[0];
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ lastInsertId: number | bigint }> {
    const [result] = await this.conn.query(sql, params) as [mysql.ResultSetHeader, mysql.FieldPacket[]];
    return { lastInsertId: result.insertId };
  }

  async exec(sql: string): Promise<void> {
    await this.conn.query(sql);
  }

  async columnExists(table: string, column: string): Promise<boolean> {
    const [rows] = await this.conn.query(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [table, column],
    ) as [mysql.RowDataPacket[], mysql.FieldPacket[]];
    return rows.length > 0;
  }

  async transaction<T>(fn: (tx: DbAdapter) => Promise<T>): Promise<T> {
    // Already in a transaction; run fn on the same connection
    return fn(this);
  }
}
