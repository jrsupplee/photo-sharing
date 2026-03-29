import type { DbAdapter } from '@/lib/db/adapter';
import getDb from '@/lib/db';

export const qrScanTable = {
  async create(adapter: DbAdapter): Promise<void> {
    if (adapter.dialect === 'mysql') {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS qr_scans (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_id INT NOT NULL,
          scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    } else if (adapter.dialect === 'postgres') {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS qr_scans (
          id SERIAL PRIMARY KEY,
          event_id INT NOT NULL,
          scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      await adapter.exec(`
        CREATE TABLE IF NOT EXISTS qr_scans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL,
          scanned_at TEXT DEFAULT (datetime('now'))
        )
      `);
    }
  },

  async record(eventId: number | string): Promise<void> {
    const db = await getDb();
    await db.execute('INSERT INTO qr_scans (event_id) VALUES (?)', [eventId]);
  },

  async countByEventId(eventId: number | string): Promise<number> {
    const db = await getDb();
    const row = await db.queryOne<{ n: number }>(
      'SELECT COUNT(*) AS n FROM qr_scans WHERE event_id = ?',
      [eventId],
    );
    return row?.n ?? 0;
  },
};
