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

This is a **Next.js 16 App Router** wedding photo sharing app. It has two audiences: guests (no login) and an admin.

### Database access rule

**All database queries must go through the repository objects in `src/lib/repositories/`.** Direct use of `getDb()` or `db.prepare()` outside of `src/lib/repositories/` and `src/lib/db.ts` itself is not permitted. Each table has its own repository file; import from the barrel at `@/lib/repositories`.

### Data layer

- **SQLite via `better-sqlite3`** — synchronous, single-file DB at `DATABASE_PATH` (default `./data/wedding.db`). Schema and migrations are in `src/lib/db.ts`, which initializes on first call to `getDb()`.
- Core tables: `events` → `albums` → `media`, plus `likes` (keyed by `session_id`) and `comments`.
- Both `media` and `comments` store the uploader's `session_id` to enable ownership checks.
- `media` rows store three storage keys: `storage_key` (original), `thumbnail_key` (400px), `medium_key` (1200px).
- The gallery query includes a `user_liked` subquery (passes `session_id` as the first bind param) so liked state is correct on first render without a client round-trip.

### Storage

`src/lib/storage/` defines a `StorageBackend` interface (`save`, `getUrl`, `delete`). The factory (`src/lib/storage/factory.ts`) selects the backend via `STORAGE_BACKEND` env var (default: `disk`). Only `DiskStorage` is currently implemented, writing to `UPLOAD_DIR` (default `./uploads`). Files are served via `src/app/api/files/[...path]/route.ts`.

Image variants (thumbnail + medium) are generated at upload time using `sharp` in `src/lib/imageVariants.ts`.

### Auth

Admin-only auth via **NextAuth v4** with a single credentials provider (email/password from `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars). Configured in `src/lib/auth.ts`. Protected routes (`/admin/dashboard/*`, `/admin/events/*`) are enforced in `src/proxy.ts` (Next.js uses `proxy.ts` instead of `middleware.ts` in this setup).

### Anonymous sessions

`src/proxy.ts` also assigns a UUID `session_id` cookie to all non-admin visitors on first request. This cookie is non-httpOnly (readable by JS), `SameSite=Lax`, and used to track likes and ownership without requiring login. The `session_id` is stored on `media` and `comments` rows at creation time. `PATCH /api/media/[id]` accepts `session_id` in the request body and allows editing `uploader_name`/`caption` if it matches the stored value; admin sessions bypass this check. The uploader's name is persisted in `localStorage` (`uploader_name` key) and auto-filled on the upload form.

### Key env vars

| Var | Default | Purpose |
|-----|---------|---------|
| `DATABASE_PATH` | `./data/wedding.db` | SQLite file location |
| `UPLOAD_DIR` | `./uploads` | Disk storage root |
| `STORAGE_BACKEND` | `disk` | Storage backend selector |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | — | Admin credentials |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | — | NextAuth config |

### Route structure

- `src/app/[eventSlug]/` — public gallery (server component fetches data, passes to `GalleryClient`)
- `src/app/[eventSlug]/upload/` — guest upload page
- `src/app/admin/` — admin login and dashboard
- `src/app/api/events/[id]/media/` — upload (POST) and list (GET) media; `[id]` param is actually the event **slug**
- `src/app/api/media/[id]/` — PATCH (edit name/caption) and DELETE; auth via session_id match or admin session
- `src/app/api/media/[id]/likes/` and `.../comments/` — per-media interactions
