export interface DbAdapter {
  readonly dialect: 'sqlite' | 'mysql' | 'postgres';
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T>(sql: string, params?: unknown[]): Promise<T | undefined>;
  execute(sql: string, params?: unknown[]): Promise<{ lastInsertId: number | bigint }>;
  exec(sql: string): Promise<void>;
  columnExists(table: string, column: string): Promise<boolean>;
  transaction<T>(fn: (tx: DbAdapter) => Promise<T>): Promise<T>;
}
