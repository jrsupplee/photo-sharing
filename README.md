# Photo Sharing

A wedding photo sharing app built with Next.js. Guests can browse galleries, upload photos, and leave likes and comments without logging in. Admins manage events, albums, and media through a protected dashboard.

## Requirements

- Node.js 18+
- npm

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

# Optional — defaults shown
DATABASE_PATH=./data/wedding.db
UPLOAD_DIR=./uploads
STORAGE_BACKEND=disk
```

The database file and upload directory are created automatically on first run.

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

## Project structure

```
src/
  app/                  # Next.js App Router pages and API routes
    [eventSlug]/        # Public gallery and upload pages
    admin/              # Admin login and dashboard
    api/                # REST API routes
  lib/
    repositories/       # All database access (one file per table)
    storage/            # Storage backend abstraction (disk by default)
    auth.ts             # NextAuth configuration
    db.ts               # SQLite connection management
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
