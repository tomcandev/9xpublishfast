# Data model

Five tables in one SQLite file. The schema is applied as idempotent DDL at
startup ([`server/src/db/migrate.ts`](../server/src/db/migrate.ts)) — there is no
migration CLI to install or codegen step to run.

```
users ──< contents ──< assets
              │
              └──< publications >── users
api_tokens (standalone, for machine access)
```

## users

| column | notes |
|---|---|
| `id` | uuid |
| `username` | unique, lowercase, **never contains `@`** |
| `email` | unique, **nullable** — a KOL can exist with a username only |
| `password_hash` | argon2id |
| `display_name` | shown in the UI |
| `role` | `admin` or `kol` |
| `active` | inactive users cannot sign in |

Login accepts a username *or* an email in the same field. Because usernames are
forbidden from containing `@`, the two namespaces can never collide, so one
lookup resolves both (`findUserByIdentifier` in
[`server/src/lib/auth.ts`](../server/src/lib/auth.ts)).

## contents

One row per piece of content to be posted.

| column | notes |
|---|---|
| `code` | unique human-facing id, e.g. `PTE-RS-001` |
| `title`, `caption` | caption is what the KOL copies |
| `content_type` | `video` or `carousel` |
| `status` | see the flow below |
| `assigned_user_id` | optional pre-assignment — only this user may claim it |
| `claimed_by`, `claimed_at` | set atomically on claim |

## assets

Media attached to a content item, ordered by `sort_order`. `file_path` is
relative to the uploads directory and is **never** sent to the client — media is
served through `/api/assets/:id`, which re-checks permissions on every request.

## publications

One row per platform a content item was posted to. A unique index on
`(content_id, platform)` means re-submitting a link for the same platform
updates the existing row rather than creating a duplicate.

This is what supports the core requirement: one KOL takes one content item and
posts it to several platforms, pasting a separate link back for each.

## api_tokens

Bearer tokens for the AI ingestion pipeline. Only a SHA-256 hash is stored; the
plaintext is shown once at creation and is not recoverable.

## Status flow

```
DRAFT ──▶ READY ──▶ CLAIMED ──▶ PUBLISHED
                        │
                        └──▶ (released) ──▶ READY
```

- `DRAFT` — created but not visible to KOLs yet
- `READY` — in the queue, claimable
- `CLAIMED` — a KOL is holding it; only they can see and act on it
- `PUBLISHED` — completed, with at least one published link recorded
- `FAILED` — reserved for problem items

## The claim lock

The single most important guarantee: **two KOLs must never hold the same item.**

It is one statement, in [`server/src/lib/claim.ts`](../server/src/lib/claim.ts):

```sql
UPDATE contents SET status='CLAIMED', claimed_by=?, claimed_at=?
WHERE id=? AND status='READY'
```

The `status='READY'` predicate lives *inside* the UPDATE, so this is a
compare-and-swap, not a read-then-write. SQLite serializes writers, so when two
requests race for the same row exactly one of them matches a `READY` row. A
result of `changes === 0` therefore means "someone else won" — definitively, not
probably.

`claimNext` picks the oldest available candidate and CAS-es it, retrying with
the next candidate if it loses a race. Items assigned to the caller are offered
before unassigned ones.

The database is opened with `journal_mode=WAL` and `busy_timeout=5000` so
concurrent writers queue instead of failing with `SQLITE_BUSY`.

### Why this is application code

An earlier version of PublishFast ran on a headless CMS, where this rule was
expressed as a permission filter (`status = READY`) rather than code. That CMS's
free tier rejects filtered permission rules outright, which silently removed
both the claim lock *and* KOL isolation — every KOL could read and edit every
row. Moving the rule into a plain `WHERE` clause makes it something no licence
tier or config screen can switch off.

Covered by [`claim.test.ts`](../server/src/lib/claim.test.ts), including 20
workers racing for one item and 30 workers against 12 items.

## Access rules

Enforced in route handlers, not configuration:

- A **KOL** can read items that are `READY` and unassigned (or assigned to them), plus anything they claimed. Nothing else.
- A KOL can only record links against an item they currently hold.
- Media inherits the same rule — an asset is only downloadable by someone allowed to see its content item.
- Unknown or forbidden items return `404`, not `403`, so ids can't be probed.
- An **admin** sees everything.

## Stale claims

If a KOL claims an item and disappears, `releaseStaleClaims(hours)` returns it to
the queue. It is exposed at `POST /api/admin/release-stale` rather than running
on a timer, so it stays an explicit action (or a cron call) instead of hidden
behaviour.
