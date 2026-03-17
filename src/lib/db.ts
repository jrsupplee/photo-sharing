import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { createTable as createEventsTable } from './tables/events';
import { createTable as createAlbumsTable } from './tables/albums';
import { createTable as createUsersTable, seedAdminIfNeeded } from './tables/users';
import { createTable as createMediaTable } from './tables/media';
import { createTable as createCommentsTable } from './tables/comments';
import { createTable as createLikesTable } from './tables/likes';
import { createTable as createEventPermissionsTable } from './tables/event-permissions';

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
    createEventsTable(db);
    createAlbumsTable(db);
    createUsersTable(db);
    createMediaTable(db);
    createCommentsTable(db);
    createLikesTable(db);
    createEventPermissionsTable(db);
    seedAdminIfNeeded(db);
  }
  return db;
}

export default getDb;
