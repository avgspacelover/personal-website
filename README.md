# Personal Archive

Next.js 14 (App Router) + TypeScript. Static-rendered public site: vocations, Experience/Projects, separate library, System/Light/Dark theme, and a mobile radial navigation with a semantic nav kept in the DOM.

## Run
    npm install && npm run setup && npm run dev

`setup` migrates and seeds. With no `DATABASE_URL`, an embedded Postgres (PGlite) is used under `.data/`. Set `DATABASE_URL` for real Postgres (same migrations in `drizzle/`). After editing `src/db/schema.ts` run `npm run db:generate`.

## Admin (Google sign-in only)
1. Google Cloud Console > OAuth client (Web). Authorized redirect URI: `<SITE_URL>/api/auth/callback/google`.
2. `cp .env.example .env`, then set `AUTH_SECRET` (`openssl rand -base64 32`), `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ADMIN_EMAILS`.
3. Sign in at `/admin`.

Auth.js handles OAuth; the session is an encrypted HttpOnly JWT cookie (3 days). Only verified Google accounts listed in `ADMIN_EMAILS` get in, and the allowlist is re-checked on every request, so removing an email revokes access at once. Sign-out clears the cookie but a copied JWT stays valid until expiry unless the email is removed from the allowlist or `AUTH_SECRET` is rotated. No password endpoint exists, so there is nothing to rate-limit locally. Every admin page and server action must call `requireAdmin()` itself; layouts are not a security boundary. Server actions get Next's built-in Origin check.

## Status vs. spec
Built: public site, IA, routes, theme without flash, radial nav, visual system, Postgres schema (`db/schema.sql`).
Also built (increment 2): /about, /resume (derived view), sitemap, robots, RSS at /feed.xml, 404. Set SITE_URL in production.
Also built: Google-only admin auth, `/admin` dashboard, vocation CRUD (`/admin/vocations`), project/experience CRUD (`/admin/entries`).
Not built: CMS editing, WYSIWYG, media uploads, resume builder/PDF, AI agent, search, export. Content now lives in the database; `src/lib/content.ts` is only the seed source (`npm run db:seed` resets the DB to it).

## Decisions
- Experience and Project share one `entry` table (kind column) instead of two. Same fields and CRUD; one canonical record each. `db/spec-schema.sql` is the original full-spec reference.
- Pages are `force-dynamic` for now. Static/ISR with `revalidatePath` on CMS save comes with the CMS.
- `entry.body` holds paragraph strings until Tiptap JSON replaces it.
- Canonical URL per record: `/<primary-vocation>/<kind>/<slug>`; other vocation pages link to it (no duplicate pages).
- Palette: pale grey + ink + blue accent (readability held up best in both themes).
- Fonts: Hanken Grotesk (UI) + IBM Plex Mono (metadata only), 3 weights total, self-hosted via @fontsource (no Google requests).
- Radial nav: two levels (Work / Library) so it stays uncluttered as vocations grow.
- Vocation slugs share the `/[section]` namespace with library collections; the CMS must reject colliding slugs.

## Next
1. Redirects for changed slugs / primary vocation. 2. Tiptap + media uploads. 3. Library editors, search, export. 4. Resume builder + PDF. 5. Agent behind a server service.
