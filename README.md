# Photo Sharing

A wedding photo sharing app built with Next.js. Guests can browse galleries, upload photos, and leave likes and comments without logging in. Admins manage events, albums, and media through a protected dashboard.

## Requirements

- Node.js 18+
- npm
- SQLite (default, no extra setup) **or** a MySQL 8+ database

## Installation

```bash
npm install
```

## Configuration

Copy the example below into a `.env.local` file and fill in the values:

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

## Database backends

| Backend | Driver | When to use |
|---------|--------|-------------|
| `sqlite` (default) | `better-sqlite3` | Single-server deployments, easy setup |
| `mysql` | `mysql2` | Multi-instance or managed database deployments |

Switch backends by setting `DB_BACKEND` in your environment. Both use the same schema — tables are created automatically on first run.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXTAUTH_SECRET` | — | NextAuth signing secret (required) |
| `NEXTAUTH_URL` | — | App base URL (required) |
| `ADMIN_EMAIL` | — | Admin email seeded on first run |
| `ADMIN_PASSWORD` | — | Admin password seeded on first run |
| `DB_BACKEND` | `sqlite` | Database backend: `sqlite` or `mysql` |
| `DATABASE_PATH` | `./data/wedding.db` | SQLite file path |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | — | MySQL username |
| `DB_PASSWORD` | — | MySQL password |
| `DB_NAME` | — | MySQL database name |
| `UPLOAD_DIR` | `./uploads` | Directory for uploaded files |
| `STORAGE_BACKEND` | `disk` | Storage backend (`disk`) |

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
