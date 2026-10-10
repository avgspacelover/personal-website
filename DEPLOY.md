# Deploying to a VPS (low-cost, single server)

Target: one Linux VPS (1 GB RAM is enough), Node 20.9+ (required by Next.js 16), PostgreSQL, a reverse proxy for HTTPS. Nothing here was run on a real VPS from my side (no systemd/Caddy in my sandbox); the app itself was tested against real PostgreSQL. Treat the unit and Caddyfile below as a starting point and check each step.

## 1. Server basics
- Create a non-root user (e.g. `archive`), enable a firewall (allow 22, 80, 443 only), keep the OS updated.
- Install Node.js 20.9+ and PostgreSQL 15+ (`apt install postgresql`).

## 2. Database (two roles: least privilege)
The running app gets a role that can only read and write data; a separate owner role runs migrations. If the app is compromised it cannot drop or alter tables.
```sql
-- as postgres
CREATE ROLE archive_owner LOGIN PASSWORD 'long-random-1';   -- migrations only
CREATE ROLE archive_app   LOGIN PASSWORD 'long-random-2';   -- the running app
CREATE DATABASE archive OWNER archive_owner;
\c archive
GRANT USAGE ON SCHEMA public TO archive_app;
ALTER DEFAULT PRIVILEGES FOR ROLE archive_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO archive_app;
```
Keep Postgres listening on localhost only.

## 3. App
```bash
git clone <your repo> /srv/archive && cd /srv/archive
npm ci
cp .env.example .env          # then fill it in (below)
MIGRATE_DATABASE_URL=postgres://archive_owner:...@localhost:5432/archive npm run db:migrate   # applies migrations as the OWNER role. For a FIRST run you may also `npm run db:seed` for placeholder content;
                              # never seed an existing site: seeding deletes content (it refuses without --force)
npm run build
```
`.env` (production):
```
DATABASE_URL=postgres://archive_app:...@localhost:5432/archive   # data-only role. Do NOT put MIGRATE_DATABASE_URL here.
SITE_URL=https://example.com
AUTH_URL=https://example.com
AUTH_SECRET=<openssl rand -base64 32>
AUTH_GOOGLE_ID=...            # Google Cloud Console > OAuth client (Web)
AUTH_GOOGLE_SECRET=...        # redirect URI: https://example.com/api/auth/callback/google
ADMIN_EMAILS=you@gmail.com
STORAGE_DRIVER=local
MEDIA_DIR=/var/lib/archive/media   # persistent, writable by the app user, included in backups
# ANTHROPIC_API_KEY=...       # optional: model-written resume bullets (record text is sent to the provider)
```
`mkdir -p /var/lib/archive/media && chown archive: /var/lib/archive/media`

## 4. Run it with systemd
`/etc/systemd/system/archive.service` (the working directory must be the project root: PDF fonts are read from `node_modules/`):
```ini
[Unit]
Description=Personal archive
After=network.target postgresql.service

[Service]
User=archive
WorkingDirectory=/srv/archive
EnvironmentFile=/srv/archive/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -p 3000 -H 127.0.0.1
Restart=on-failure

[Install]
WantedBy=multi-user.target
```
`systemctl enable --now archive`

## 5. HTTPS reverse proxy (Caddy gets certificates automatically)
`/etc/caddy/Caddyfile`:
```
example.com {
  request_body { max_size 8MB }     # uploads are limited to 5 MB
  reverse_proxy 127.0.0.1:3000
}
```
Admin cookies are `Secure` in production, so HTTPS is required. Point your domain's DNS A record at the server first.

## 6. Backups (do this before you have content you care about)
Three things hold your site: the database, the media directory, and your `.env`.
`/usr/local/bin/archive-backup.sh`:
```bash
#!/bin/sh
set -e
D=/var/backups/archive/$(date +%F); mkdir -p "$D"
pg_dump "$DATABASE_URL" -Fc -f "$D/db.dump"
tar -C /var/lib/archive -czf "$D/media.tgz" media
cd /srv/archive && npm run -s export -- "$D/content.json"      # portable JSON copy (no media files)
find /var/backups/archive -maxdepth 1 -mtime +30 -exec rm -rf {} +
```
Cron daily (`0 3 * * *`, with `DATABASE_URL` exported or sourced from `.env`), then copy `/var/backups/archive` OFF the server (rclone, rsync or a second machine). Restore: `pg_restore -d archive --clean db.dump`, untar `media.tgz`.

## 7. Updating
```bash
cd /srv/archive && git pull && npm ci && MIGRATE_DATABASE_URL=postgres://archive_owner:...@localhost:5432/archive npm run db:migrate && npm run build && sudo systemctl restart archive
```

## 8. Security notes
- **The app must only be reachable through the reverse proxy** (the unit binds 127.0.0.1; firewall port 3000). Rate limiting keys on the *last* `X-Forwarded-For` entry, which Caddy sets to the real client address; a client talking to the app directly could forge that header and dodge the limits.
- **Rate limits** (per IP per minute, in `src/proxy.ts`): `/api/auth` 30, `/admin/login` 20, `/search` 30, `/resume/pdf` 6, everything 600. They are in memory, so per process; add proxy-level limits if you run several instances.
- **Headers:** a Content-Security-Policy with a per-request nonce, frame blocking, nosniff, referrer and permissions policies, and HSTS (production). If something misbehaves after deploy, open the browser console: set `CSP_REPORT_ONLY=1` to log violations without blocking while you investigate, and tell me what it reports.
- **Sign everyone out:** set `SESSIONS_VALID_AFTER=<now, ISO format>` in `.env` and restart. Sessions last 24 h. Removing an email from `ADMIN_EMAILS` revokes that person at once.
- **Audit:** `/admin/audit` lists sign-ins (allowed and denied) and every admin change.
- Run `npm audit --omit=dev` before each deploy.

## 9. After first deploy, check
- `/admin` redirects to sign-in; your Google account (in `ADMIN_EMAILS`) gets in; another account is refused.
- Upload an image; reload it from `/media/...`; confirm files appear in `MEDIA_DIR`.
- Download a resume PDF; `/sitemap.xml` and `/robots.txt` use your real domain.
- Moving media to S3/R2 later: `src/lib/storage/README.md`.
