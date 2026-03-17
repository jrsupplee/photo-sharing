import type Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      date_start TEXT,
      date_end TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      "order" INTEGER DEFAULT 0,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      album_id INTEGER,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      caption TEXT,
      uploader_name TEXT,
      session_id TEXT,
      storage_key TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      body TEXT NOT NULL,
      session_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_id INTEGER NOT NULL,
      session_id TEXT NOT NULL,
      UNIQUE(media_id, session_id),
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'event_manager',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS event_permissions (
      user_id INTEGER NOT NULL,
      event_id INTEGER NOT NULL,
      PRIMARY KEY (user_id, event_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );
  `);

  // Migrations — media
  const mediaCols = (db.prepare('PRAGMA table_info(media)').all() as { name: string }[]).map(c => c.name);
  if (!mediaCols.includes('thumbnail_key')) db.exec('ALTER TABLE media ADD COLUMN thumbnail_key TEXT');
  if (!mediaCols.includes('medium_key'))    db.exec('ALTER TABLE media ADD COLUMN medium_key TEXT');
  if (!mediaCols.includes('session_id'))    db.exec('ALTER TABLE media ADD COLUMN session_id TEXT');
  if (!mediaCols.includes('deleted_at'))    db.exec('ALTER TABLE media ADD COLUMN deleted_at TEXT');
  if (!mediaCols.includes('deleted_by'))    db.exec('ALTER TABLE media ADD COLUMN deleted_by TEXT');
  if (!mediaCols.includes('file_hash'))     db.exec('ALTER TABLE media ADD COLUMN file_hash TEXT');

  // Migrations — comments
  const commentCols = (db.prepare('PRAGMA table_info(comments)').all() as { name: string }[]).map(c => c.name);
  if (!commentCols.includes('session_id')) db.exec('ALTER TABLE comments ADD COLUMN session_id TEXT');

  // Migrations — events
  const eventCols = (db.prepare('PRAGMA table_info(events)').all() as { name: string }[]).map(c => c.name);
  if (!eventCols.includes('default_album_id')) db.exec('ALTER TABLE events ADD COLUMN default_album_id INTEGER');

  // Migrations — users
  const userCols = (db.prepare('PRAGMA table_info(users)').all() as { name: string }[]).map(c => c.name);
  if (!userCols.includes('session_id')) db.exec('ALTER TABLE users ADD COLUMN session_id TEXT');

  // Seed initial admin if no users exist
  const userCount = (db.prepare('SELECT COUNT(*) as n FROM users').get() as { n: number }).n;
  if (userCount === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
    db.prepare(`INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, 'admin')`)
      .run(process.env.ADMIN_EMAIL, 'Admin', hash);
  }
}
