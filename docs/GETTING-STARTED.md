# Use the Personal Archive

This guide is for someone running their own copy of the Personal Archive. Your installation is a private, single-owner site: you own the server, database, uploaded media, and Google OAuth credentials.

## What you need

- Node.js 20.9 or newer and npm for local development.
- A Google account and a Google OAuth web client to sign in to `/admin`. Follow the [Google OAuth registration guide (PDF)](../output/pdf/google-oauth-registration.pdf).
- For a public production site: a domain, HTTPS, a PostgreSQL database, and persistent storage for uploaded media. See [DEPLOY.md](../DEPLOY.md).

## Run a local copy

1. Clone or download the repository and open a terminal in its root directory.
2. Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell, or `cp .env.example .env` on macOS/Linux).
3. Configure these values in `.env`:

   ```dotenv
   SITE_URL=http://localhost:3000
   AUTH_URL=http://localhost:3000
   AUTH_SECRET=<a-long-random-secret>
   AUTH_GOOGLE_ID=<your-google-client-id>
   AUTH_GOOGLE_SECRET=<your-google-client-secret>
   ADMIN_EMAILS=<your-google-account-email>
   DATABASE_URL=
   MEDIA_DIR=.data/media
   ```

   Generate `AUTH_SECRET` with `openssl rand -base64 32`, or another secure random generator. Do not commit `.env` or share your Google client secret.

4. In your Google OAuth client, add this exact authorized redirect URI:

   ```text
   http://localhost:3000/api/auth/callback/google
   ```

   The callback must match the URL used by the local server. The PDF guide explains where to enter it in Google Cloud.

5. Install dependencies and initialize a fresh local database:

   ```sh
   npm ci
   npm run setup
   npm run dev
   ```

   With `DATABASE_URL` blank, local development uses PGlite in `.data/pg`. `npm run setup` applies migrations and loads fictional placeholder records. It is for a fresh development database only; never use `db:seed -- --force` on a database containing your own archive.

6. Visit `http://localhost:3000`, then sign in at `http://localhost:3000/admin` with the Google account listed in `ADMIN_EMAILS`.

If the Google OAuth app is in Testing mode, add your Google account in its Test users settings. This is suitable for your own private site; do not add other users unless you intend to grant them Google-level access to the OAuth app. The app also checks `ADMIN_EMAILS` before allowing admin access.

## Publish your own site

For production, use a real domain with HTTPS, PostgreSQL, and a persistent media directory. Set `SITE_URL` and `AUTH_URL` to the public origin, create or update the Google client with this exact redirect URI, and keep secrets outside source control:

```text
https://your-domain.example/api/auth/callback/google
```

The complete current VPS procedure, including the reverse proxy, database roles, service setup, and backup checklist, is in [DEPLOY.md](../DEPLOY.md). Google OAuth is the only admin sign-in method; each installation owns its own client ID and secret. Do not reuse credentials from another site's installation.

## Your content and backups

Replace the placeholder records and site settings with your own content. Public pages show only records you publish. The optional Anthropic resume provider sends the job description and relevant record text to Anthropic; leave `ANTHROPIC_API_KEY` unset to use the offline provider.

Back up PostgreSQL, the media directory, and your environment configuration. The JSON export is useful as a content copy but is not a full restore: it does not include media files, resume versions, agent runs, or audit history. Keep backups private because they may contain personal information.

The source code is MIT-licensed. Personal archive data, uploaded media, sample content, branding, and third-party components or assets are excluded; see [LICENSE-NOTICE.md](../LICENSE-NOTICE.md).
