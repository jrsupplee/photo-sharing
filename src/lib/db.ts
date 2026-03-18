import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { eventTable } from './tables/events';
import { albumTable } from './tables/albums';
import { userTable, seedAdminIfNeeded } from './tables/users';
import { mediaTable } from './tables/media';
import { commentTable } from './tables/comments';
import { likeTable } from './tables/likes';
import { eventPermissionTable } from './tables/event-permissions';

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
    // Create tables in dependency order
    eventTable.create(db);
    albumTable.create(db);
    userTable.create(db);
    mediaTable.create(db);
    commentTable.create(db);
    likeTable.create(db);
    eventPermissionTable.create(db);
    seedAdminIfNeeded(db);
  }
  return db;
}

export default getDb;
