# Deployment

PublishFast is one Node process and one SQLite file. No database server, no
object storage, no containers.

## Requirements

- **Node.js 22 LTS.** Node 24 is not usable yet: `better-sqlite3` and other
  native modules build against V8 APIs that changed. Use `nvm install 22`.
- systemd (or any process supervisor)
- A way to expose the port — the reference deployment uses a Cloudflare Tunnel;
  a normal reverse proxy works too

## Layout on the server

```
~/projects/publishfast/
  server/  web/           # the app
  web/dist/               # built frontend, served by the API process
  data/                   # gitignored — publishfast.db + uploads/
  .env                    # secrets, chmod 600
```

Everything worth backing up lives in `data/`. The rest is reproducible from git.

## Install

```bash
git clone https://github.com/tomcandev/publishfast.git ~/projects/publishfast
cd ~/projects/publishfast

source ~/.nvm/nvm.sh && nvm install 22 && nvm use 22
npm install
npm run build

cp .env.example .env
# set AUTH_SECRET — openssl rand -hex 32
chmod 600 .env

npm run seed     # prints the admin password
```

`AUTH_SECRET` is mandatory when `NODE_ENV=production`; the server refuses to
start without it rather than silently signing sessions with a dev fallback.

## systemd

`deploy/publishfast.service` is in the repo. Note the `ExecStart` path:

```ini
ExecStart=/home/ubuntu/.nvm/versions/node/v22.23.2/bin/node server/dist/index.js
```

It must be the **absolute path to the nvm-installed Node 22 binary**. systemd
does not source `nvm.sh`, so a bare `node` may resolve to the wrong version.

```bash
sudo cp deploy/publishfast.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now publishfast
systemctl status publishfast
```

## Exposing it

The server binds to `127.0.0.1` by default — it is not reachable from the
internet on its own.

### Cloudflare Tunnel (what the reference deployment uses)

A tunnel makes an **outbound** connection to Cloudflare, so no inbound port
needs to be open at all. That matters on hosts where the cloud firewall blocks
everything except SSH by default (Oracle Cloud, for instance) — you never have
to touch the network ACL. Cloudflare also terminates TLS and creates the DNS
record for you.

```bash
sudo cloudflared service install <TOKEN>
```

Then in the tunnel's **Published application routes**, add:
`publishfast.example.com` → `HTTP` → `localhost:8055`. Saving that creates the
DNS record automatically; delete any pre-existing `A` record for the same name
first or the save will conflict.

### Reverse proxy instead

Any proxy works — point it at `127.0.0.1:8055` and terminate TLS there. If you
do, open 80/443 in both the host firewall *and* your provider's network ACL.

## Backups

```bash
tar -czf ~/backups/publishfast-$(date +%F).tar.gz -C ~/projects/publishfast data
```

Daily at 03:00, keeping two weeks:

```cron
0 3 * * * find ~/backups -name 'publishfast-*.tar.gz' -mtime +14 -delete && tar -czf ~/backups/publishfast-$(date +\%F).tar.gz -C ~/projects/publishfast data
```

SQLite runs in WAL mode, so copy the whole `data/` directory (not just the `.db`
file) to be sure the `-wal` and `-shm` sidecars come along.

## Upgrades

```bash
cd ~/projects/publishfast
git pull
npm install
npm run build
sudo systemctl restart publishfast
```

Schema changes apply automatically at boot. `data/` is never touched by a
deploy.

## Configuration

| variable | default | notes |
|---|---|---|
| `AUTH_SECRET` | — | **required in production**, `openssl rand -hex 32` |
| `PORT` | `8055` | |
| `HOST` | `127.0.0.1` | keep it on loopback behind a proxy or tunnel |
| `DATA_DIR` | `./data` | database and uploads |
| `PUBLIC_URL` | `http://localhost:8055` | used for absolute links |
| `MAX_UPLOAD_BYTES` | `536870912` (512 MB) | per file |

## Troubleshooting

**`better-sqlite3` fails to build** — you are on Node 24. Switch to 22 and
`rm -rf node_modules && npm install`.

**Service starts then exits** — check `journalctl -u publishfast -n 50`. The
usual cause is a missing `AUTH_SECRET` with `NODE_ENV=production`.

**Uploads fail on large videos** — raise `MAX_UPLOAD_BYTES`, and if you use
Cloudflare's proxy note that the free plan caps request bodies at 100 MB.
