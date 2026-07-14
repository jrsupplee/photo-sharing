# Photo Sharing

A wedding photo sharing app built with Next.js. Guests can browse galleries, upload photos, and leave likes and comments without logging in. Admins manage events, albums, and media through a protected dashboard.

## Requirements

- Node.js 18+
- npm
- SQLite (default, no extra setup), MySQL 8+, or PostgreSQL 14+

Or, for a containerized install, just Docker with the Compose plugin — see [Docker](#docker).

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

```bash
# Admin credentials (required)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=changeme

# NextAuth (required)
NEXTAUTH_SECRET=generate-a-random-secret-here   # e.g. openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Database — SQLite (default, no extra config needed)
DB_BACKEND=sqlite
DATABASE_PATH=./data/wedding.db

# Database — MySQL (set DB_BACKEND=mysql and fill these in)
# DB_BACKEND=mysql
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=wedding
# DB_PASSWORD=secret
# DB_NAME=wedding

# Database — PostgreSQL (set DB_BACKEND=postgres and fill these in)
# DB_BACKEND=postgres
# DB_HOST=localhost
# DB_PORT=5432
# DB_USER=wedding
# DB_PASSWORD=secret
# DB_NAME=wedding

# Storage
UPLOAD_DIR=./uploads
STORAGE_BACKEND=disk
```

The database file (SQLite) and upload directory are created automatically on first run. Tables are created and migrated on startup for both backends.

## Development

```bash
npm run dev
```

The app runs on [http://localhost:3000](http://localhost:3000).

The first time the server starts it seeds an admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Sign in at `/admin`.

## Production

```bash
npm run build
npm start
```

Make sure `NEXTAUTH_URL` is set to your public URL in production.

## Docker

The repo includes a `Dockerfile` and `docker-compose.yml` for running the app in a container. The container listens on port **3001**.

1. **Configure.** Copy `.env.example` to `.env.local` and fill in the values as described in [Configuration](#configuration). Set `NEXTAUTH_URL` to the public URL the app will be reached at.

2. **Optionally set the run user.** Add `UID` and `GID` to `.env.local` to control which user the app runs as inside the container — and therefore who owns the files in `data/` and `uploads/` on the host. Defaults to `1000:1000` when unset. On first start the container fixes ownership of the mounted directories automatically.

   ```bash
   # e.g. run as the deploy user
   UID=1001
   GID=1001
   ```

3. **Build and start:**

   ```bash
   docker compose --env-file .env.local up -d --build
   ```

   The `--env-file .env.local` flag is required — Compose only substitutes variables like `UPLOAD_HOST_DIR` (below) from `.env.local` when told to look there; it does not pick it up automatically the way `env_file:` inside the compose file does for the container's own environment.

   The app is served on [http://localhost:3001](http://localhost:3001). On first run it creates the database, seeds the admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD`, and creates the upload directory.

### Data and persistence

The SQLite database and uploaded files are stored on the host via bind mounts:

| Host path   | Container path | Contents                          |
| ----------- | -------------- | --------------------------------- |
| `./data`    | `/app/data`    | SQLite database (`wedding.db`)    |
| `./uploads` | `/app/uploads` | Uploaded photos, videos, variants |

`DATABASE_PATH` and `UPLOAD_DIR` in `.env.local` are ignored in Docker — the compose file pins them to the container paths above so host-specific paths can't break the mounts.

The `./uploads` host path can be overridden by setting `UPLOAD_HOST_DIR` in `.env.local` (e.g. to reuse an existing non-Docker deployment's directory), as long as you run Compose with `--env-file .env.local` as shown above:

```bash
# .env.local
UPLOAD_HOST_DIR=/var/www/vhosts/photos/uploads
```

The `./data` mount isn't parameterized the same way; to relocate it, edit the `volumes:` entry in `docker-compose.yml` directly, e.g.:

```yaml
volumes:
  - /var/www/vhosts/photos/data:/app/data
  - ${UPLOAD_HOST_DIR:-./uploads}:/app/uploads
```

To use MySQL or PostgreSQL instead of SQLite, set the `DB_BACKEND` block in `.env.local` as usual; the `./data` mount is then unused.

### Operations

```bash
docker compose logs -f                              # tail app logs (replaces pm2 log files)
docker compose restart                               # restart the app
docker compose --env-file .env.local up -d --build   # rebuild and redeploy after pulling changes
docker compose --env-file .env.local down            # stop and remove the container (data survives)
```

The container restarts automatically on crashes and on boot (`restart: unless-stopped`), so a separate process manager such as pm2 is not needed.

## Database backends

| Backend            | Driver           | Default port | When to use                                      |
| ------------------ | ---------------- | ------------ | ------------------------------------------------ |
| `sqlite` (default) | `better-sqlite3` | —            | Single-server deployments, easy setup            |
| `mysql`            | `mysql2`         | 3306         | Multi-instance or managed MySQL deployments      |
| `postgres`         | `pg`             | 5432         | Multi-instance or managed PostgreSQL deployments |

Switch backends by setting `DB_BACKEND` in your environment. All three use the same schema — tables are created automatically on first run.

## Migrating from SQLite to MySQL

If you outgrow a single-server SQLite deployment (e.g. you need multiple app instances, or want a managed database), you can move to MySQL without changing any application code — just the config and the data.

1. **Create the MySQL database and user**, and grant it full privileges on that database:

   ```sql
   CREATE DATABASE wedding CHARACTER SET utf8mb4;
   CREATE USER 'wedding'@'%' IDENTIFIED BY 'secret';
   GRANT ALL PRIVILEGES ON wedding.* TO 'wedding'@'%';
   ```

2. **Create the schema.** Point a throwaway run of the app at the new MySQL database (`DB_BACKEND=mysql` plus the `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` vars from [Configuration](#configuration)) and start it once — `getDb()` creates all tables in dependency order on boot, then exits/restarts as normal. No data is copied yet.

3. **Copy the data.** There's no built-in export/import command, so use [`scripts/migrate-to-mysql.mjs`](scripts/migrate-to-mysql.mjs), which reads from the SQLite file and writes to MySQL, table by table, in the same dependency order the app creates them in: `events` → `albums` → `users` → `media` → `comments` → `likes` → `event_permissions` → `sessions` → `qr_scans`.

   ```bash
   DB_HOST=localhost DB_PORT=3306 DB_USER=wedding DB_PASSWORD=secret DB_NAME=wedding \
     node scripts/migrate-to-mysql.mjs ./data/wedding.db
   ```

   or

   ```bash
   set -a; source .env.local; set +a
   node scripts/migrate-to-mysql.mjs
   ```

   `INSERT`ing explicit primary key values is safe — MySQL advances each table's `AUTO_INCREMENT` counter past the highest inserted id automatically, so new rows created after the migration won't collide.

4. **Point the app at MySQL** by updating `.env.local` (or your deployment's env vars) with the `DB_BACKEND=mysql` block and restart. `UPLOAD_DIR`/`STORAGE_BACKEND` don't need to change — uploaded files live on disk independently of the database backend.

5. **Verify** by signing in at `/admin` and confirming events, albums, and media all show up, then spot-check likes/comments on a gallery page.

Keep the old `DATABASE_PATH` SQLite file around as a backup until you've confirmed the MySQL copy is complete and correct.

## Environment variables

| Variable                     | Default             | Description                                                      |
| ---------------------------- | ------------------- | ---------------------------------------------------------------- |
| `NEXTAUTH_SECRET`            | —                   | NextAuth signing secret (required)                               |
| `NEXTAUTH_URL`               | —                   | App base URL (required)                                          |
| `ADMIN_EMAIL`                | —                   | Admin email seeded on first run                                  |
| `ADMIN_PASSWORD`             | —                   | Admin password seeded on first run                               |
| `DB_BACKEND`                 | `sqlite`            | Database backend: `sqlite`, `mysql`, or `postgres`               |
| `DATABASE_PATH`              | `./data/wedding.db` | SQLite file path                                                 |
| `DB_HOST`                    | `localhost`         | MySQL host                                                       |
| `DB_PORT`                    | `3306`              | MySQL port                                                       |
| `DB_USER`                    | —                   | MySQL username                                                   |
| `DB_PASSWORD`                | —                   | MySQL password                                                   |
| `DB_NAME`                    | —                   | MySQL database name                                              |
| `UPLOAD_DIR`                 | `./uploads`         | Directory for uploaded files                                     |
| `STORAGE_BACKEND`            | `disk`              | Storage backend (`disk`)                                         |
| `GALLERY_REFRESH_INTERVAL`   | —                   | Auto-refresh the guest gallery every N seconds (omit to disable) |
| `NEXT_PUBLIC_QR_CODE_SIZE`   | `512`               | QR code PNG export size in pixels                                |
| `NEXT_PUBLIC_QR_AVATAR_SIZE` | `0.35`              | Avatar size as a fraction of QR code width (e.g. `0.35` = 35%)   |

## Project structure

```
src/
  app/                  # Next.js App Router pages and API routes
    [eventSlug]/        # Public gallery and upload pages
    admin/              # Admin login and dashboard
    api/                # REST API routes
  lib/
    db/                 # Database adapter layer
      adapter.ts        # DbAdapter interface
      sqlite-adapter.ts # better-sqlite3 implementation
      mysql-adapter.ts  # mysql2 implementation
      index.ts          # Factory and singleton getDb()
    tables/             # All database access (one file per table)
    storage/            # Storage backend abstraction (disk by default)
    auth.ts             # NextAuth configuration
  components/           # Shared React components
  types/                # TypeScript types
data/                   # SQLite database (auto-created)
uploads/                # Uploaded files (auto-created)
```

## Admin setup

After signing in at `/admin`, use the dashboard to:

1. Create an **event** with a URL slug (e.g. `smith-jones-2025`)
2. Optionally add **albums** to organise uploads
3. Share the public gallery URL (`/<slug>`) and upload URL (`/<slug>/upload`) with guests

Additional admin and event-manager accounts can be created from the Users section of the dashboard.

## Building documentation PDFs

Documentation lives in `docs/` as AsciiDoc files. To build PDFs you need:

- [`asciidoctor`](https://asciidoctor.org/)
- [`asciidoctor-pdf`](https://docs.asciidoctor.org/pdf-converter/latest/)

Install on macOS:

```bash
gem install asciidoctor asciidoctor-pdf
```

Then from the `docs/` directory:

```bash
make
```
