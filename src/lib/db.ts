import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { initSchema } from './repositories/schema';

const dbPath = process.env.DATABASE_PATH || './data/wedding.db';
const absoluteDbPath = path.resolve(process.cwd(), dbPath);

// Ensure directory exists
const dbDir = path.dirname(absoluteDbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(absoluteDbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

export default getDb;
