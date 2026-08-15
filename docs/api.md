# HTTP API

Two ways to authenticate:

- **Session cookie** — humans, via `POST /api/auth/login`. The cookie is httpOnly and SameSite=Lax.
- **Bearer token** — machines (the AI pipeline). Create one in Admin → API Tokens, or with `PF_CREATE_TOKEN=name npm run seed`.

```
Authorization: Bearer pf_xxxxxxxxxxxxxxxx
```

All responses are JSON. Errors look like `{ "error": "message" }`, sometimes with
a `reason` code.

---

## Auth

### `POST /api/auth/login`

`identifier` accepts **either a username or an email**.

```json
{ "identifier": "yoga", "password": "..." }
```

Returns `{ user }` and sets the session cookie. Wrong credentials return `401`
with the same message whether the account exists or not.

### `POST /api/auth/logout` · `GET /api/me`

---

## Queue (session required)

### `GET /api/contents?status=READY`
Items the caller is allowed to see — already scoped, no client-side filtering needed.

### `GET /api/contents/stats`
```json
{ "available": 3, "claimed": 1, "published": 12 }
```

### `GET /api/contents/:id`
Returns the item with its `assets` and `publications`. `404` if the caller may not see it.

### `POST /api/contents/claim-next`
Atomically claims the oldest available item — the "Claim next post" button.
`404` with `reason: "empty_queue"` when nothing is available.

### `POST /api/contents/:id/claim`
Claims one specific item. `409` with `reason: "already_claimed"` if another KOL won the race.

### `POST /api/contents/:id/release`
Returns a claimed item to the queue. Only the claimant, or an admin.

### `POST /api/contents/:id/complete`
Marks the item `PUBLISHED`. Requires at least one saved link, otherwise `400`.

### `GET /api/history`
Items this KOL has completed.

---

## Publications (session required)

### `POST /api/publications`

```json
{
  "contentId": "…",
  "platform": "tiktok",
  "publishedUrl": "https://www.tiktok.com/@you/video/123"
}
```

Platforms: `tiktok`, `instagram`, `youtube_shorts`, `facebook`, `other`.

Submitting the same `(contentId, platform)` again updates the existing row.
Returns `403` if the caller is not holding that content item.

### `DELETE /api/publications/:id`

---

## Media (session required)

| route | purpose |
|---|---|
| `GET /api/assets/:id` | inline — video player, image preview |
| `GET /api/assets/:id/download` | attachment download |
| `GET /api/contents/:id/assets.zip` | whole carousel as one zip |

Each request re-checks that the caller may see the parent content item, so media
is exactly as protected as the item itself.

---

## Ingestion — for the AI pipeline

Bearer token (or an admin session).

### `POST /api/ingest/contents`

```json
{
  "code": "PTE-RS-001",
  "title": "Repeat Sentence Tip",
  "caption": "Most PTE students make this mistake...",
  "contentType": "video",
  "status": "READY"
}
```

`status` defaults to `DRAFT`; use `READY` to put it straight into the queue.
`409` if `code` already exists.

### `POST /api/ingest/contents/:id/assets`

`multipart/form-data`, one or more files. Files stream straight to disk, so a
large video never sits in memory. Order of upload becomes `sort_order`.

```bash
curl -X POST https://publishfast.example.com/api/ingest/contents/$ID/assets \
  -H "Authorization: Bearer $TOKEN" \
  -F "file1=@video.mp4;type=video/mp4"
```

### `PATCH /api/ingest/contents/:id`
Update fields — typically flipping `DRAFT` → `READY` after review.

### End-to-end example

```bash
TOKEN=pf_...
BASE=https://publishfast.example.com

ID=$(curl -sS -X POST $BASE/api/ingest/contents \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"code":"PTE-001","caption":"...","status":"READY"}' \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["content"]["id"])')

curl -sS -X POST $BASE/api/ingest/contents/$ID/assets \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@video.mp4;type=video/mp4"
```

---

## Admin (admin session or admin token)

| route | purpose |
|---|---|
| `GET/POST /api/admin/users` · `PATCH /api/admin/users/:id` | manage accounts |
| `GET /api/admin/contents` · `PATCH`/`DELETE /api/admin/contents/:id` | manage content |
| `DELETE /api/admin/assets/:id` | remove a file |
| `GET /api/admin/publications` | all recorded links |
| `GET/POST /api/admin/tokens` · `DELETE /api/admin/tokens/:id` | API tokens |
| `POST /api/admin/release-stale` | `{ "hours": 24 }` — requeue abandoned claims |

## Health

`GET /api/health` → `{ "ok": true }`
