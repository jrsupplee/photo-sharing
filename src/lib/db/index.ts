import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';
import { SqliteAdapter } from './sqlite-adapter';
import { MySqlAdapter } from './mysql-adapter';
import type { DbAdapter } from './adapter';
import { eventTable } from '../tables/events';
import { albumTable } from '../tables/albums';
import { userTable, seedAdminIfNeeded } from '../tables/users';
import { mediaTable } from '../tables/media';
import { commentTable } from '../tables/comments';
import { likeTable } from '../tables/likes';
import { eventPermissionTable } from '../tables/event-permissions';

let dbPromise: Promise<DbAdapter> | null = null;

async function initDb(): Promise<DbAdapter> {
  const backend = process.env.DB_BACKEND || 'sqlite';
  let adapter: DbAdapter;

  if (backend === 'mysql') {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      dateStrings: true,
      waitForConnections: true,
      connectionLimit: 10,
    });
    adapter = new MySqlAdapter(pool);
  } else {
    const dbPath = process.env.DATABASE_PATH || './data/wedding.db';
    const absoluteDbPath = path.resolve(process.cwd(), dbPath);
    const dbDir = path.dirname(absoluteDbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const db = new Database(absoluteDbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    adapter = new SqliteAdapter(db);
  }

  // Create tables in dependency order
  await eventTable.create(adapter);
  await albumTable.create(adapter);
  await userTable.create(adapter);
  await mediaTable.create(adapter);
  await commentTable.create(adapter);
  await likeTable.create(adapter);
  await eventPermissionTable.create(adapter);
  await seedAdminIfNeeded(adapter);

  return adapter;
}

export default function getDb(): Promise<DbAdapter> {
  if (!dbPromise) {
    dbPromise = initDb();
  }
  return dbPromise;
}
