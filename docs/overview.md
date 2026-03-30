# Overview

A web app for sharing photos and videos at wedding events. Guests browse and contribute without creating accounts; admins manage events through a protected dashboard.

---

## Guest Features

| Feature  | Details                                                                                              |
| -------- | ---------------------------------------------------------------------------------------------------- |
| Gallery  | Masonry grid (2–4 columns); filter by album or uploader                                              |
| Lightbox | Full-screen view with caption, uploader name, likes, and comments                                    |
| Upload   | Photos (JPEG, PNG, GIF, WebP, HEIC) and videos (MP4, MOV, AVI); drag-and-drop, file picker, or paste |
| Likes    | Toggle like on any item; state persists via session cookie                                           |
| Comments | Add comments from the lightbox                                                                       |
| Delete   | Guests can soft-delete their own uploads                                                             |

No login required. A browser cookie tracks ownership of uploads, likes, and comments.

---

## Admin Features

| Feature       | Details                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Dashboard     | Event list with photo/album counts                                                                                        |
| Events        | Create and manage events: name, slug, dates, albums, require-name toggle                                                  |
| Avatar        | Upload a circular crop avatar per event; shown in gallery and upload page headers                                         |
| QR Code       | Auto-generated for the guest gallery URL; includes event avatar in the centre; scan count tracked; download as SVG or PNG |
| Albums        | Add, rename, reorder, delete; lock albums as read-only to restrict guest uploads                                          |
| Download      | ZIP of all event media, optionally filtered by album                                                                      |
| Deleted media | View and restore soft-deleted items from the gallery's Deleted tab                                                        |
| Users         | Create admin or event manager accounts; assign managers to specific events                                                |

---

## How Sessions Work

- Guests get a UUID `session_id` cookie on first visit (httpOnly, 1-year expiry)
- This cookie is the identity for uploads, likes, comments, and deletes
- Admins log in with email/password; their `session_id` is preserved across logins so ownership survives re-authentication

---

## Technical Summary

- **Framework**: Next.js 16 App Router, TypeScript, Tailwind CSS
- **Database**: SQLite (default), MySQL, or PostgreSQL — selected via `DB_BACKEND` env var
- **Storage**: Files saved to disk under `UPLOAD_DIR`; served with Range-request support for video streaming
- **Image processing**: Sharp generates a 400px thumbnail and 1200px medium variant at upload time
- **Video processing**: FFmpeg extracts a thumbnail from the 1-second mark
- **Auth**: NextAuth v4, JWT strategy, credentials provider; two roles: `admin` and `event_manager`
