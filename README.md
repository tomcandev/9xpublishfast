<div align="center">

# PublishFast

**A manual-first content distribution queue for short-form social content.**

Self-contained. SQLite. No external services. `npm install && npm run dev`.

</div>

---

## What it is

AI (or a human) drops a video or carousel plus a caption into PublishFast. A KOL opens the app, taps **Lấy bài tiếp theo**, gets exactly one post to work on, downloads the media, copies the caption, publishes it natively in TikTok / Instagram / YouTube, pastes the resulting links back, and marks it done.

```
AI generator ──▶ PublishFast queue ──▶ KOL claims one item
                                            │
                      download media + copy caption
                                            │
                    publish natively in the social app
                                            │
                        paste links back ──▶ done
```

## Why manual posting is the point

Publishing through official APIs loses the things that actually make short-form content work: trending sounds picked inside the app, native text overlays, covers, effects, and whatever the platform shipped last week. PublishFast does not try to automate the posting step. It makes **everything around** that step fast — getting the next item, downloading assets, copying the caption, and tracking who posted what where.

That makes it a different tool from a social scheduler (Buffer, Postiz, Mixpost), which is built around `create → schedule → auto-publish`.

## Features

- **Real claim locking.** Two KOLs can never end up holding the same item — enforced by a single-statement compare-and-swap in SQLite, with a concurrency test to prove it
- **Proper isolation.** A KOL sees unclaimed work plus their own items, and nothing else. Enforced in code, not in config
- **Login with username or email.** Type `yoga`, not `yoga@long-domain.example.com`
- **One-tap caption copy** and one-click media download, including whole carousels as a zip
- **Multi-platform tracking.** One content item, one link per platform, all recorded
- **API for automation.** Bearer-token endpoints so a content generator can push items and upload media
- **Runs anywhere.** One Node process and one SQLite file — no database server, no object storage, no containers required

## Quick start

```bash
git clone https://github.com/tomcandev/publishfast.git
cd publishfast
npm install
npm run seed     # creates an admin account and prints the password
npm run dev      # API on :8055, web on :5173
```

Open http://localhost:5173 and sign in with the credentials `seed` printed.

Seed a KOL and an ingest token at the same time:

```bash
PF_ADMIN_USER=tom PF_ADMIN_PASS=changeme123 \
PF_KOL_USER=yoga PF_KOL_PASS=yoga-pass-123 \
PF_CREATE_TOKEN=ai-pipeline \
npm run seed
```

## Production

```bash
npm run build    # builds the web app; the server then serves it too
npm start        # single process on PORT (default 8055)
```

See [docs/deployment.md](docs/deployment.md) for the systemd unit, backups, and the Cloudflare Tunnel setup used by the reference deployment.

## Docs

| | |
|---|---|
| [docs/data-model.md](docs/data-model.md) | Tables, status flow, and how the claim lock works |
| [docs/api.md](docs/api.md) | Full HTTP API, including the ingestion endpoints for AI |
| [docs/deployment.md](docs/deployment.md) | Running it on a server, backups, upgrades |

## Stack

Node 22 · Fastify · SQLite (better-sqlite3) · Drizzle ORM · React · Vite · TypeScript.

Every dependency is permissively licensed (MIT or Apache-2.0). There is no source-available or copyleft component anywhere in the tree, so you can self-host, fork, and ship this without licence homework.

## Project history

`plan.txt` is the original design document this was built from — kept because it explains *why* the system is shaped the way it is. An earlier iteration was built on a headless CMS; it was replaced with this self-contained app when the CMS's free tier turned out to block the filtered-permission rules the claim lock depended on.

## License

MIT — see [LICENSE](LICENSE).
