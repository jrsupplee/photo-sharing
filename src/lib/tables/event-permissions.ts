import type Database from "better-sqlite3";
import getDb from "@/lib/db";
import { User } from "./users";

export const eventPermissionTable = {
  create(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS event_permissions (
        user_id INTEGER NOT NULL,
        event_id INTEGER NOT NULL,
        PRIMARY KEY (user_id, event_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      );
    `);
  },

  insertOrIgnore(
    userId: number | string,
    eventId: number | string,
  ): number | bigint {
    return getDb()
      .prepare(
        "INSERT OR IGNORE INTO event_permissions (user_id, event_id) VALUES (?, ?)",
      )
      .run(userId, eventId).lastInsertRowid;
  },

  /** Event IDs a user can manage */
  getEventIdsForUser(userId: number | string): number[] {
    return (
      getDb()
        .prepare("SELECT event_id FROM event_permissions WHERE user_id = ?")
        .all(userId) as { event_id: number }[]
    ).map((r) => r.event_id);
  },

  /** Users who can manage a given event */
  getUsersForEvent(eventId: number | string): User[] {
    return getDb()
      .prepare(
        `
      SELECT u.id, u.email, u.name, u.role, u.created_at
      FROM users u
      INNER JOIN event_permissions ep ON u.id = ep.user_id
      WHERE ep.event_id = ?
    `,
      )
      .all(eventId) as User[];
  },

  hasPermission(userId: number | string, eventId: number | string): boolean {
    return !!getDb()
      .prepare(
        "SELECT 1 FROM event_permissions WHERE user_id = ? AND event_id = ?",
      )
      .get(userId, eventId);
  },

  /** Replace all event permissions for a user */
  setForUser(userId: number | string, eventIds: number[]): void {
    const db = getDb();
    db.transaction(() => {
      db.prepare("DELETE FROM event_permissions WHERE user_id = ?").run(userId);
      for (const eventId of eventIds) this.insertOrIgnore(userId, eventId);
    })();
  },

  /** Replace all user permissions for an event */
  setForEvent(eventId: number | string, userIds: number[]): void {
    const db = getDb();
    db.transaction(() => {
      db.prepare("DELETE FROM event_permissions WHERE event_id = ?").run(
        eventId,
      );
      for (const userId of userIds) this.insertOrIgnore(userId, eventId);
    })();
  },
};
