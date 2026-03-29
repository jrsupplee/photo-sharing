# Software Specifications: Wedding Photo Sharing App

<!-- notion: 332e28a2-6255-8023-9680-f9a4f0567270 -->

## 1. Overview

A web application for sharing photos and videos at wedding events. Guests browse galleries, upload media, and engage with likes and comments — all without creating accounts. Authenticated admins and event managers administer events, albums, and content through a protected dashboard.

---

## 2. Technology Stack

| Layer            | Technology                                                 |
| ---------------- | ---------------------------------------------------------- |
| Framework        | Next.js 16.1.6 (App Router)                                |
| Language         | TypeScript 5                                               |
| UI               | React 19.2.3, Tailwind CSS 4                               |
| Database         | SQLite (default), MySQL, PostgreSQL                        |
| Auth             | NextAuth.js 4 (JWT, credentials provider)                  |
| Image processing | Sharp 0.34.5                                               |
| Video processing | FFmpeg via fluent-ffmpeg                                   |
| Gallery UI       | react-photo-album 3.5.1, yet-another-react-lightbox 3.29.1 |
| Archive          | archiver 7.0.1                                             |

---

## 3. Architecture

### 3.1 Application Structure

```
src/
  app/                    # Next.js App Router pages and API routes
    [eventSlug]/          # Public gallery and upload pages
    admin/                # Admin dashboard pages
    api/                  # REST API endpoints
  components/             # Shared React components
  lib/                    # Business logic, data access, utilities
    db/                   # Database adapters and factory
    tables/               # Data access objects (one per table)
    storage/              # File storage backend
  types/                  # TypeScript type definitions
```

### 3.2 Data Flow

- All database access goes through table objects in `src/lib/tables/`
- Direct `getDb()` usage is restricted to `src/lib/tables/` and `src/lib/db.ts`
- Storage operations go through the `StorageBackend` interface in `src/lib/storage/`
- API routes validate authorization then delegate to table objects

---

## 4. Database Schema

The schema supports SQLite, MySQL, and PostgreSQL. Foreign keys cascade on delete unless noted.

### 4.1 users

| Column        | Type             | Notes                               |
| ------------- | ---------------- | ----------------------------------- |
| id            | integer PK       | auto-increment                      |
| email         | varchar UNIQUE   | login identifier                    |
| name          | varchar          | display name                        |
| password_hash | varchar          | bcrypt, 10 rounds                   |
| role          | varchar          | `admin` or `event_manager`          |
| session_id    | varchar nullable | guest session linked at first login |
| created_at    | timestamp        |                                     |
|               | INDEX            | `session_id`                        |

### 4.2 events

| Column           | Type                | Notes                             |
| ---------------- | ------------------- | --------------------------------- |
| id               | integer PK          | auto-increment                    |
| slug             | varchar UNIQUE      | URL path segment                  |
| name             | varchar             | display name                      |
| date_start       | varchar nullable    | event start date                  |
| date_end         | varchar nullable    | event end date                    |
| default_album_id | integer FK nullable | pre-selected album on upload form |
| require_name     | boolean             | enforce uploader name at upload   |
| avatar_key       | varchar nullable    | storage key for event avatar      |
| created_at       | timestamp           |                                   |

### 4.3 albums

| Column    | Type                | Notes                                          |
| --------- | ------------------- | ---------------------------------------------- |
| id        | integer PK          | auto-increment                                 |
| event_id  | integer FK → events | CASCADE delete                                 |
| name      | varchar             | display name                                   |
| order     | integer             | display order within event                     |
| read_only | boolean             | if true, only admins/event_managers may upload |
|           | INDEX               | `event_id`                                     |

### 4.4 media

| Column        | Type                         | Notes                                 |
| ------------- | ---------------------------- | ------------------------------------- |
| id            | integer PK                   | auto-increment                        |
| event_id      | integer FK → events          | CASCADE delete                        |
| album_id      | integer FK nullable → albums | CASCADE delete                        |
| filename      | varchar                      | `{slug}/{uuid}.{ext}`                 |
| original_name | varchar                      | uploader's original filename          |
| mime_type     | varchar                      | e.g. `image/jpeg`, `video/mp4`        |
| size          | integer                      | bytes                                 |
| caption       | varchar nullable             |                                       |
| uploader_name | varchar nullable             | guest display name                    |
| session_id    | varchar nullable             | anonymous uploader's UUID             |
| storage_key   | varchar                      | relative path in storage root         |
| thumbnail_key | varchar nullable             | 400px JPEG variant                    |
| medium_key    | varchar nullable             | 1200px JPEG variant                   |
| file_hash     | varchar                      | SHA-256; used for duplicate detection |
| deleted_at    | timestamp nullable           | soft-delete timestamp                 |
| deleted_by    | varchar nullable             | session_id of deleter                 |
| created_at    | timestamp                    |                                       |
|               | INDEX                        | `event_id`                            |
|               | INDEX                        | `album_id`                            |
|               | INDEX                        | `session_id`                          |

### 4.5 comments

| Column      | Type               | Notes            |
| ----------- | ------------------ | ---------------- |
| id          | integer PK         | auto-increment   |
| media_id    | integer FK → media | CASCADE delete   |
| author_name | varchar            |                  |
| body        | text               |                  |
| session_id  | varchar nullable   | commenter's UUID |
| created_at  | timestamp          |                  |
|             | INDEX              | `session_id`     |

### 4.6 likes

| Column     | Type               | Notes                    |
| ---------- | ------------------ | ------------------------ |
| id         | integer PK         | auto-increment           |
| media_id   | integer FK → media | CASCADE delete           |
| session_id | varchar            | UUID                     |
|            | UNIQUE             | `(media_id, session_id)` |
|            | INDEX              | `session_id`             |

### 4.7 event_permissions

| Column   | Type                | Notes                 |
| -------- | ------------------- | --------------------- |
| user_id  | integer FK → users  | CASCADE delete        |
| event_id | integer FK → events | CASCADE delete        |
|          | PK                  | `(user_id, event_id)` |

### 4.8 sessions

| Column     | Type                | Notes          |
| ---------- | ------------------- | -------------- |
| session_id | integer             | CASCADE delete |
| event_id   | integer FK → events | CASCADE delete |
| name       | varchar             |                |
|            | INDEX               | `session_id`   |

### 4.9 qr_scans

| Column     | Type                | Notes          |
| ---------- | ------------------- | -------------- |
| id         | integer PK          | auto-increment |
| event_id   | integer FK → events | CASCADE delete |
| scanned_at | timestamp           |                |

---

## 5. Storage

### 5.1 Backends

`STORAGE_BACKEND` env var selects the backend (default: `disk`). All backends implement:

```typescript
interface StorageBackend {
  save(key: string, data: Buffer, mimeType: string): Promise<void>;
  getUrl(key: string): string;
  delete(key: string): Promise<void>;
}
```

Currently only `disk` is implemented. Files are served via `GET /api/files/[...path]`.

### 5.2 Disk Storage

- Root directory: `UPLOAD_DIR` env var (default `./uploads`)
- File key format: `{eventSlug}/{uuid}.{ext}`
- HTTP serving: supports `Range` requests (HTTP 206) for video streaming
- Cache headers: `immutable`, `max-age=31536000`
- Security: path traversal prevented by validating paths against upload root

### 5.3 Image Variants

Generated at upload time via Sharp:

| Variant       | Max width | Format | Quality |
| ------------- | --------- | ------ | ------- |
| thumbnail_key | 400px     | JPEG   | 75%     |
| medium_key    | 1200px    | JPEG   | 85%     |

Both variants use progressive encoding and automatic EXIF rotation. For video files, FFmpeg extracts a frame at the 1-second mark as the thumbnail.

---

## 6. Authentication and Sessions

### 6.1 Admin Authentication

- NextAuth.js v4 with JWT strategy and credentials provider
- Email + bcrypt password verification against `users` table
- JWT stored in secure httpOnly cookie
- Roles: `admin` (full access), `event_manager` (scoped to assigned events)

### 6.2 Guest Sessions

- `src/proxy.ts` assigns a UUID `session_id` cookie to all non-admin visitors on first request
- Cookie: `httpOnly`, `SameSite=Lax`, `maxAge` 1 year, `Secure` in production
- Because the cookie is httpOnly, client components cannot read it directly; `GET /api/session` exposes the value to client code that needs it (e.g. the login form), and the upload page reads it server-side and passes it as a prop to `UploadForm`
- Used for: upload ownership, likes, comments, and delete authorization
- Not PII; no account required

### 6.3 Session Persistence for Admin Users

On first login, the user's existing anonymous `session_id` cookie is saved to `users.session_id`. On all subsequent logins the stored value is restored into the JWT and re-applied to the cookie, so likes and upload ownership persist across login sessions.

### 6.4 Authorization Helpers (`src/lib/authorization.ts`)

- `isAdmin(session)` — returns true if `session.user.role === 'admin'`
- `canManageEvent(session, eventId)` — returns true if admin, or if event_manager has a row in `event_permissions`

---

## 7. API Reference

### 7.1 Authentication

| Method | Route                     | Auth | Description                                        |
| ------ | ------------------------- | ---- | -------------------------------------------------- |
| POST   | `/api/auth/[...nextauth]` | —    | NextAuth sign-in / sign-out                        |
| GET    | `/api/session`            | —    | Returns `{ sessionId }` from the httpOnly cookie   |

### 7.2 Events

| Method | Route                     | Auth           | Description                 |
| ------ | ------------------------- | -------------- | --------------------------- |
| GET    | `/api/events`             | admin          | List all events             |
| POST   | `/api/events`             | admin          | Create event                |
| PUT    | `/api/events/[id]`        | canManageEvent | Update event                |
| DELETE | `/api/events/[id]`        | admin          | Delete event                |
| POST   | `/api/events/[id]/avatar` | canManageEvent | Upload/replace event avatar |
| DELETE | `/api/events/[id]/avatar` | canManageEvent | Remove event avatar         |

### 7.3 Albums

| Method | Route              | Auth           | Description                     |
| ------ | ------------------ | -------------- | ------------------------------- |
| PATCH  | `/api/albums/[id]` | canManageEvent | Update album fields (read_only) |

### 7.4 Media

| Method | Route                     | Auth                         | Description                  |
| ------ | ------------------------- | ---------------------------- | ---------------------------- |
| GET    | `/api/events/[id]/media`  | —                            | List media for event (slug)  |
| POST   | `/api/events/[id]/media`  | —                            | Upload media to event (slug) |
| PATCH  | `/api/media/[id]`         | session_id or canManageEvent | Edit name/caption            |
| DELETE | `/api/media/[id]`         | session_id or canManageEvent | Soft-delete                  |
| POST   | `/api/media/[id]/restore` | canManageEvent               | Restore soft-deleted item    |

### 7.5 Likes and Comments

| Method | Route                      | Auth       | Description                         |
| ------ | -------------------------- | ---------- | ----------------------------------- |
| GET    | `/api/media/[id]/likes`    | —          | Like count and caller's like status |
| POST   | `/api/media/[id]/likes`    | session_id | Toggle like                         |
| GET    | `/api/media/[id]/comments` | —          | List comments                       |
| POST   | `/api/media/[id]/comments` | session_id | Add comment                         |

### 7.6 Download

| Method | Route                       | Auth           | Description                                             |
| ------ | --------------------------- | -------------- | ------------------------------------------------------- |
| GET    | `/api/events/[id]/download` | canManageEvent | Stream ZIP of event media; optional `?album_id=` filter |

ZIP contents are organized into per-album folders. Colliding filenames are deduplicated with a numeric suffix (`photo (2).jpg`).

### 7.7 Files

| Method | Route                  | Auth | Description                       |
| ------ | ---------------------- | ---- | --------------------------------- |
| GET    | `/api/files/[...path]` | —    | Serve stored file; supports Range |

### 7.8 Admin — Users

| Method | Route                          | Auth  | Description               |
| ------ | ------------------------------ | ----- | ------------------------- |
| GET    | `/api/admin/users`             | admin | List users                |
| POST   | `/api/admin/users`             | admin | Create user               |
| PATCH  | `/api/admin/users/[id]`        | admin | Update user               |
| DELETE | `/api/admin/users/[id]`        | admin | Delete user               |
| GET    | `/api/admin/users/[id]/events` | admin | Events assigned to user   |
| PUT    | `/api/admin/users/[id]/events` | admin | Replace event assignments |

### 7.9 QR Scan Tracking

| Method | Route       | Auth | Description                                    |
| ------ | ----------- | ---- | ---------------------------------------------- |
| GET    | `/q/[id]`   | —    | Record QR scan for event, redirect to gallery  |

### 7.10 Admin — Backfill

| Method | Route                          | Auth  | Description                  |
| ------ | ------------------------------ | ----- | ---------------------------- |
| GET    | `/api/admin/backfill-variants` | admin | Count media missing variants |
| POST   | `/api/admin/backfill-variants` | admin | Generate missing variants    |

---

## 8. Pages

### 8.1 Public Pages

| Route                 | Description                                                    |
| --------------------- | -------------------------------------------------------------- |
| `/`                   | Landing page; lists all events or redirects if only one exists |
| `/[eventSlug]`        | Public gallery; masonry grid with lightbox, likes, comments    |
| `/[eventSlug]/upload` | Guest upload form                                              |

### 8.2 Admin Pages

| Route                | Description                                             |
| -------------------- | ------------------------------------------------------- |
| `/admin`             | Redirects to `/admin/login`                             |
| `/admin/login`       | Login page; password visibility toggle                  |
| `/admin/dashboard`   | Event list with stats; image variant backfill           |
| `/admin/events/new`  | Create event form                                       |
| `/admin/events/[id]` | Manage event: General / Albums / Download / Delete tabs |
| `/admin/users`       | User CRUD and event permission assignment               |

---

## 9. Feature Specifications

### 9.1 Upload

- Accepts image (`jpg`, `jpeg`, `png`, `gif`, `webp`, `heic`, `heif`) and video (`mp4`, `mov`, `avi`) files
- Input methods: file picker, drag-and-drop, clipboard paste (desktop and mobile)
- Optional fields: uploader name, caption, album (select from event albums)
- Read-only albums are excluded from the guest album selector; uploading to a read-only album requires `canManageEvent` and returns `403` otherwise
- If `require_name` is set on the event, uploader name is required
- Uploader name persisted in `localStorage` (`uploader_name` key) for auto-fill
- Files upload in parallel; per-file and overall progress shown in a modal
- Duplicate detection: SHA-256 hash checked against existing media
  - Exact duplicate → rejected with duplicate status
  - Matches a soft-deleted item uploaded by the same session → item restored
- Image variants generated in parallel with original save
- `session_id` stored on the media row for ownership tracking

### 9.2 Gallery

- Server-rendered masonry grid using `react-photo-album` (2–4 columns, responsive)
- `user_liked` correlated subquery runs server-side; no client round-trip needed for initial like state
- Images open in a lightbox (yet-another-react-lightbox) with captions, navigation, and comment panel
- Videos display with a thumbnail and play-button overlay; clicking opens `VideoModal`
- Album tag shown on hover
- Admins see a Deleted tab showing soft-deleted items with a Restore button
- When a read-only album is selected, the header Upload link is greyed out and the floating "Share a Memory" button is hidden for guests; admins are unaffected
- Event avatar (if set) is displayed as a circle beside the event name in the sticky header

### 9.3 Lightbox and Video

- Lightbox shows: caption, uploader name, like count and toggle, comment panel, edit and delete controls
- Edit: uploader name and caption; available to the original uploader (matching `session_id`) or any admin/event_manager
- Delete: soft-delete with confirmation; available to original uploader or admin
- `VideoModal`: full-screen player with browser-native controls; streams via Range requests

### 9.4 Likes

- One like per `(media_id, session_id)` pair enforced at database level
- Toggle: liking again removes the like
- Count displayed alongside heart icon

### 9.5 Comments

- Author name and body required
- Listed chronologically in the lightbox comment panel
- No edit or delete for guests; admins can delete via media soft-delete

### 9.6 Admin Event Management

Event settings (General tab):

- Name, slug (URL), date range, default album, require-name toggle
- **Avatar**: upload a circular avatar image for the event; a canvas-based crop editor lets the admin drag to pan and scroll/pinch to zoom before saving; stored via the storage backend at `events/{slug}/avatar_{uuid}.jpg`; displayed in the gallery and upload page headers
- **QR Code**: generates a QR code at `/q/{event.id}` (short redirect that records a scan then redirects to the gallery); the event avatar is composited at the centre of the code (35% width, circular crop, white backing ring); uses H-level error correction; downloadable as SVG or 512×512 PNG; scan count displayed in the admin UI; base URL sourced from `NEXTAUTH_URL`

Albums tab:

- Add, rename, reorder (drag or order field), and delete albums
- Each album has a read-only toggle; read-only albums accept uploads only from admins and event managers
- Read-only albums are hidden from the album selector on the guest upload form
- Deleting an album nulls `album_id` on its media (not CASCADE deleted by default)

Download tab:

- Download all media as ZIP, or filter by album
- Organized into per-album subdirectories

Delete tab:

- Hard-delete the entire event; cascades to albums, media, comments, likes, permissions

### 9.7 Admin User Management

- Create accounts with `admin` or `event_manager` role
- Assign/revoke event permissions for `event_manager` accounts
- Cannot delete own account
- Password stored as bcrypt hash

### 9.8 Soft Delete and Restore

- `DELETE /api/media/[id]` sets `deleted_at` and `deleted_by`; files remain on disk
- Deleted items are hidden from the public gallery (`WHERE deleted_at IS NULL`)
- Admins see a Deleted tab on the public gallery page with Restore option
- `POST /api/media/[id]/restore` clears `deleted_at` and `deleted_by`; requires `canManageEvent`
- Uploading a file with the same SHA-256 hash as a soft-deleted item (same `session_id`) restores it automatically

### 9.9 Image Variant Backfill

- Admin dashboard shows count of media rows missing `thumbnail_key` or `medium_key`
- POST to `/api/admin/backfill-variants` processes all such rows in one request
- Used when new storage or processing logic is deployed against existing data

---

## 10. Environment Variables

| Variable          | Default             | Description                        |
| ----------------- | ------------------- | ---------------------------------- |
| `NEXTAUTH_SECRET` | —                   | Required. JWT signing secret       |
| `NEXTAUTH_URL`    | —                   | Required. App base URL             |
| `ADMIN_EMAIL`     | —                   | Seeded admin email on first run    |
| `ADMIN_PASSWORD`  | —                   | Seeded admin password on first run |
| `DB_BACKEND`      | `sqlite`            | `sqlite`, `mysql`, or `postgres`   |
| `DATABASE_PATH`   | `./data/wedding.db` | SQLite file path                   |
| `DB_HOST`         | `localhost`         | MySQL/PostgreSQL host              |
| `DB_PORT`         | `3306`              | MySQL/PostgreSQL port              |
| `DB_USER`         | —                   | MySQL/PostgreSQL username          |
| `DB_PASSWORD`     | —                   | MySQL/PostgreSQL password          |
| `DB_NAME`         | —                   | MySQL/PostgreSQL database name     |
| `UPLOAD_DIR`      | `./uploads`         | Disk storage root                  |
| `STORAGE_BACKEND` | `disk`              | Storage backend selector           |

---

## 11. Security

| Concern             | Mitigation                                                             |
| ------------------- | ---------------------------------------------------------------------- |
| Password storage    | bcrypt, 10 rounds                                                      |
| Session hijacking   | JWT in httpOnly cookie; secure in production                           |
| CSRF                | Built-in NextAuth protection                                           |
| SQL injection       | Parameterized queries via DbAdapter                                    |
| Path traversal      | Upload paths validated against `UPLOAD_DIR`                            |
| Unauthorized writes | `session_id` match or `canManageEvent` required for mutations          |
| File type abuse     | MIME type validated on upload; image and video only                    |
| Data recovery       | Soft-delete preserves data; hard delete requires explicit admin action |

---

## 12. Non-Functional Requirements

- **Database initialization**: Tables and column migrations run automatically on first startup; no manual migration step needed
- **Multi-instance deployment**: Use MySQL or PostgreSQL; SQLite is not safe for concurrent writes across multiple processes
- **Node.js version**: 18 or later
- **Build**: `npm run build` produces a standard Next.js `.next/` output; served with `next start`
- **Development**: `npm run dev` starts on `0.0.0.0:3000`
- **Linting**: `npm run lint` (ESLint)
- **Tests**: None
