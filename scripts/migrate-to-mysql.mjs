// One-off data migration from the SQLite database to MySQL.
// See "Migrating from SQLite to MySQL" in README.md for usage.
//
// Usage:
//   DB_HOST=localhost DB_PORT=3306 DB_USER=wedding DB_PASSWORD=secret DB_NAME=wedding \
//     node scripts/migrate-to-mysql.mjs [path-to-sqlite-file]
//
// Run this after the MySQL schema has already been created (start the app once
// with DB_BACKEND=mysql pointed at the target database before running this).

import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';

const TABLES = [
  'events',
  'albums',
  'users',
  'media',
  'comments',
  'likes',
  'event_permissions',
  'sessions',
  'qr_scans',
];

const sqlitePath = process.argv[2] || process.env.DATABASE_PATH || './data/wedding.db';

const sqlite = new Database(sqlitePath, { readonly: true });
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const conn = await pool.getConnection();
try {
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of TABLES) {
    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
    for (const row of rows) {
      const columns = Object.keys(row);
      const placeholders = columns.map(() => '?').join(', ');
      await conn.query(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
        columns.map(c => row[c])
      );
    }
    console.log(`${table}: migrated ${rows.length} rows`);
  }
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
} finally {
  conn.release();
  await pool.end();
  sqlite.close();
}
