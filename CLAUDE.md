# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server on 0.0.0.0:3000
npm run build    # production build
npm run lint     # ESLint
```

There are no tests.

## Architecture

This is a **Next.js 16 App Router** wedding photo sharing app. Two audiences: guests (no login) and authenticated admins/event managers.

### Database access rule

**All database queries must go through the repository objects in `src/lib/repositories/`.** Direct use of `getDb()` or `db.prepare()` outside of `src/lib/repositories/` and `src/lib/db.ts` itself is not permitted. Import from the barrel at `@/lib/repositories`.

### Data layer

- **SQLite via `better-sqlite3`** — synchronous DB at `DATABASE_PATH` (default `./data/wedding.db`).
- `getDb()` in `src/lib/db.ts` manages the connection. On first call it runs `initSchema()` from `src/lib/repositories/schema.ts`, which creates all tables and applies column migrations. **All schema and migration SQL lives in `schema.ts`** — not in `db.ts` or individual repo files. This separation exists to avoid a circular import: repo files import `getDb` from `db.ts`, so `db.ts` must not import from the repos barrel.
- Core tables: `events` → `albums` → `media`, plus `likes` and `comments`.
- `media` stores three storage keys: `storage_key` (original), `thumbnail_key` (400px), `medium_key` (1200px). Variants are generated at upload time via `sharp` in `src/lib/imageVariants.ts`.
- `media` has `deleted_at` and `deleted_by` columns for soft-delete. All public/guest queries filter `WHERE deleted_at IS NULL`. Admins see a Deleted tab in the event management UI.
- `events` has a `default_album_id` (nullable) that pre-selects an album on the guest upload form.

### Storage

`src/lib/storage/` defines a `StorageBackend` interface (`save`, `getUrl`, `delete`). The factory (`src/lib/storage/factory.ts`) picks the backend via `STORAGE_BACKEND` env var (default `disk`). `DiskStorage` writes to `UPLOAD_DIR` (default `./uploads`). Files are served via `src/app/api/files/[...path]/route.ts`. When media is soft-deleted, files are **not** removed from storage.

### Auth and roles

- **NextAuth v4**, credentials provider, JWT strategy. Configured in `src/lib/auth.ts`, which uses `userRepo` (not `getDb` directly).
- Two roles: `admin` (full access) and `event_manager` (access to permitted events via `event_permissions` table). Authorization helpers are in `src/lib/authorization.ts` (`isAdmin`, `canManageEvent`).
- Protected admin routes are enforced in `src/proxy.ts` via `getToken` from `next-auth/jwt`. `src/proxy.ts` is used instead of `middleware.ts` in this setup.

### Anonymous sessions and session_id

`src/proxy.ts` assigns a UUID `session_id` cookie to all non-admin visitors on first request (non-httpOnly, `SameSite=Lax`, 1-year `maxAge`). This single mechanism handles guest ownership of uploaded media, likes, and comments without login.

- `session_id` is stored on `media` and `comments` rows at creation time.
- `PATCH /api/media/[id]` and `DELETE /api/media/[id]` accept `session_id` (body / query param) and allow the action if it matches the stored value; admin sessions bypass this check.
- `DELETE /api/media/[id]` is a **soft delete** — sets `deleted_at` and `deleted_by` (the deleter's `session_id`), leaves files on disk.
- **Authenticated users have a persistent `session_id`**: on first login the user's anonymous `session_id` is saved to `users.session_id`. On every subsequent login it is restored into the JWT and re-applied to the `session_id` cookie by the middleware, so likes and upload ownership survive across login sessions.
- The uploader's name is persisted in `localStorage` (`uploader_name` key) and auto-filled on the upload form.
- The gallery query passes `session_id` as the first bind parameter for a correlated `user_liked` subquery, so liked state is correct on first server render without a client round-trip.

### Key env vars

| Var | Default | Purpose |
|-----|---------|---------|
| `DATABASE_PATH` | `./data/wedding.db` | SQLite file location |
| `UPLOAD_DIR` | `./uploads` | Disk storage root |
| `STORAGE_BACKEND` | `disk` | Storage backend selector |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | — | Seeded on first run if no users exist |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | — | NextAuth config |

### Route structure

- `src/app/[eventSlug]/` — public gallery; server component fetches media (with `user_liked`) and passes to `GalleryClient` → `MediaGrid`
- `src/app/[eventSlug]/upload/` — guest upload page; passes `albums` and `default_album_id` to `UploadForm`
- `src/app/admin/` — login, dashboard, event management (`/admin/events/[id]` has Settings / Media / Deleted tabs)
- `src/app/api/events/[id]/media/` — POST upload, GET list; `[id]` is the event **slug**
- `src/app/api/media/[id]/` — PATCH (edit name/caption), DELETE (soft-delete); auth via `session_id` match or `canManageEvent`
- `src/app/api/media/[id]/restore/` — POST to restore a soft-deleted item; requires `canManageEvent`
- `src/app/api/media/[id]/likes/` and `.../comments/` — per-media interactions
