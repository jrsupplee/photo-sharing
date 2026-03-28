# Core Upload Mechanics

## 1. Client-side flow

The user selects files via the file picker, drag-and-drop, or clipboard paste. Files are held in React state as `File[]` objects and shown as previews. Nothing is sent to the server until the user submits the form.

On submit, the form fields (uploader name, caption, album) are written to `localStorage` for auto-fill on future visits, then an `UploadSession` object is created in a ref and `executeUpload()` is called.

### Sequential execution

Files upload one at a time, not in parallel. This avoids saturating a mobile connection, makes progress straightforward to track, and keeps server-side processing (image resizing, FFmpeg) from stacking up.

### Resumable upload session

The session is stored in `uploadSessionRef` — a plain ref, not React state — so it survives re-renders and is accessible to event listeners without stale closures. It tracks:

| Field                                             | Purpose                                                        |
| ------------------------------------------------- | -------------------------------------------------------------- |
| `files`                                           | The original `File[]` array                                    |
| `uploaderName`, `caption`, `albumId`, `sessionId` | Metadata sent with each file                                   |
| `completed`                                       | `Set<number>` of file indices confirmed done (HTTP 200 or 409) |
| `permanentlyFailed`                               | `Set<number>` of indices that got a non-transient HTTP error   |
| `successCount`, `duplicateCount`                  | Running totals for the results screen                          |

At the top of each loop iteration, the function checks `document.hidden`. If the tab is hidden, it exits immediately without marking the current index as anything — leaving it unresolved so it will be retried when the user comes back. A `visibilitychange` listener detects the return and calls `executeUpload()` again; the loop restarts from index 0, skipping anything already in `completed` or `permanentlyFailed`.

Network errors and exceptions are also caught without recording the index as failed, since they are most likely caused by browser suspension rather than a permanent problem with the file.

The `isRunningRef` flag prevents the `visibilitychange` handler from launching a second concurrent execution if the tab briefly flickers.

### Progress

Progress is calculated as `(completed.size + permanentlyFailed.size) / files.length`, updated after each file. Because skipped-and-retried files were already counted when they first succeeded, the percentage only ever increases.

---

## 2. Server-side flow

Each file is a separate `multipart/form-data` POST to `POST /api/events/[slug]/media`.

### Duplicate detection

Before writing anything to disk, the server computes a SHA-256 hash of the file bytes and queries `media` for a matching `(event_id, file_hash)` pair.

- **Active duplicate** — row exists and `deleted_at IS NULL` → return `409 Conflict`. No file is written.
- **Soft-deleted match** — row exists and `deleted_at IS NOT NULL` → restore the row (clear `deleted_at`/`deleted_by`, update metadata fields with the new submission) and return `200`. No file is written; the original bytes on disk are reused.
- **No match** → proceed with the upload.

This makes the upload idempotent: if a file was already successfully uploaded before a mobile interruption, retrying it costs nothing beyond the hash lookup.

### Storage and variant generation

The file is saved and its image variants are generated in parallel:

```
Promise.all([
  storage.save(buffer, filename, mimeType),   // writes original to disk
  generateImageVariants(buffer, filename, mimeType),  // produces thumb + medium
])
```

`generateImageVariants` (`src/lib/imageVariants.ts`):

- **Images** — passes the raw buffer directly to Sharp.
- **Videos** — writes the buffer to a temp file, runs FFmpeg with `-ss 00:00:01 -frames:v 1` to extract a frame at the 1-second mark, reads the output JPEG, then removes both temp files.
- Generates two variants in parallel using Sharp:

  | Variant   | Key suffix    | Max width | Format | Quality          |
  | --------- | ------------- | --------- | ------ | ---------------- |
  | Thumbnail | `_thumb.jpg`  | 400px     | JPEG   | 75%, progressive |
  | Medium    | `_medium.jpg` | 1200px    | JPEG   | 85%, progressive |

  Both use `.rotate()` for automatic EXIF orientation correction. Neither is enlarged beyond the original dimensions (`withoutEnlargement: true`).

The storage key for each file is the relative path under `UPLOAD_DIR` (e.g. `my-event/abc123.jpg`). Variant keys follow the same pattern with a suffix: `my-event/abc123_thumb.jpg`, `my-event/abc123_medium.jpg`.

### Database record

After storage, a row is inserted into `media` with all three storage keys (`storage_key`, `thumbnail_key`, `medium_key`), the file hash, the original filename, MIME type, size, metadata fields, and the uploader's `session_id` for ownership tracking. The insert returns `201 Created` with the new row.

---

## 3. File serving

Files are served from `GET /api/files/[...path]`. The handler:

1. Resolves the requested path against `UPLOAD_DIR` and rejects anything that escapes it (path traversal protection).
2. Checks for a `Range` header. If present, opens a read stream over exactly the requested byte range and returns `206 Partial Content` with the appropriate `Content-Range` header. This is required for video seeking in mobile browsers.
3. Without a range header, streams the whole file.
4. Sends `Cache-Control: public, max-age=31536000, immutable` on all responses. Because filenames include a UUID, they are content-addressed in practice and safe to cache indefinitely.

---

## 4. Session identity

Anonymous uploaders are identified by a `session_id` UUID cookie set by `src/proxy.ts` on their first request. The client reads this cookie and includes it as a form field on each upload POST. The server stores it on the `media` row.

This `session_id` is later used to:

- Authorise `PATCH` (edit) and `DELETE` requests from the original uploader without a login.
- Pre-populate `user_liked` on the gallery query so the heart icon renders correctly on first load.
- Link upload ownership to an admin account if the user later logs in (stored in `users.session_id` on first login and restored on every subsequent login).
