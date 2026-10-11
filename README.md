# Personal Archive

Next.js 14 (App Router) + TypeScript. Static-rendered public site: vocations, Experience/Projects, separate library, System/Light/Dark theme, and a mobile radial navigation with a semantic nav kept in the DOM.

## Run
    npm install && npm run setup && npm run dev

`setup` migrates and seeds placeholder content (first run only: `db:seed` refuses to run on a database that already has content unless you pass `--force`, because seeding deletes content). With no `DATABASE_URL`, an embedded Postgres (PGlite) is used under `.data/`. Set `DATABASE_URL` for real Postgres (same migrations in `drizzle/`). After editing `src/db/schema.ts` run `npm run db:generate`.

Deploying to a VPS: see `DEPLOY.md`. The app has been exercised against both the embedded PGlite and a real PostgreSQL server (all migrations, public pages, admin CRUD, JSONB bodies, redirects, PDF, agent, uploads, export).

## Site settings and caching
`/admin/settings` edits the site name, homepage headline/intro, the "Currently" block, the About page (both rich text), a default description, an optional public contact email and "Elsewhere" links. Nothing is shown unless entered; blank fields use defaults; links must be http(s)/mailto. The row is included in the JSON export.
Caching: public pages render per request (measured 18-34 ms TTFB with real Postgres, ~4 KB gzipped HTML), because the nonce-based CSP needs fresh HTML per request; static/ISR caching would mean weakening the CSP for no noticeable gain. Immutable caching is used for media and static assets, and the public resume PDF is cached in memory for 60 s. Client JS on the home page is ~175 KB gzipped (React 19 + Next runtime).

## Security (spec section 9)
- **Auth:** Google sign-in only (Auth.js), email allowlist re-checked on every request, 24 h encrypted HttpOnly session cookie (Secure over HTTPS). `SESSIONS_VALID_AFTER` revokes all sessions. Every admin page/action/route authorizes server-side.
- **Rate limiting + CSP:** `src/proxy.ts` (limits listed in `DEPLOY.md`; nonce-based CSP, `CSP_REPORT_ONLY=1` to soften). Static headers in `next.config.mjs`.
- **Data access:** optional two-role Postgres setup (`MIGRATE_DATABASE_URL` for migrations, `DATABASE_URL` data-only for the app).
- **Input:** every text field is length-capped, rich text is whitelisted, URLs scheme-checked, bodies limited to 500 KB, uploads decoded and size-limited.
- **Audit log** (`/admin/audit`) of sign-ins and admin actions. Redirects never reveal where a now-private record moved.
- **Dependencies:** Next 16, React 19, current Auth.js/Drizzle/Tiptap; `npm audit --omit=dev` reports 0 vulnerabilities (dev-only tooling has a few moderate advisories, not shipped).
- **Not verified in a browser:** CSP with the Google sign-in redirect, and the Tiptap 3 editor under React 19. Check both once locally.

## Admin (Google sign-in only)
1. Google Cloud Console > OAuth client (Web). Authorized redirect URI: `<SITE_URL>/api/auth/callback/google`.
2. `cp .env.example .env`, then set `AUTH_SECRET` (`openssl rand -base64 32`), `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ADMIN_EMAILS`.
3. Sign in at `/admin`.

Auth.js handles OAuth; the session is an encrypted HttpOnly JWT cookie (3 days). Only verified Google accounts listed in `ADMIN_EMAILS` get in, and the allowlist is re-checked on every request, so removing an email revokes access at once. Sign-out clears the cookie but a copied JWT stays valid until expiry unless the email is removed from the allowlist or `AUTH_SECRET` is rotated. No password endpoint exists, so there is nothing to rate-limit locally. Every admin page and server action must call `requireAdmin()` itself; layouts are not a security boundary. Server actions get Next's built-in Origin check.

## Search, export, SEO
- Search: every term must match; fields are weighted (title > organization/creator/tags/tech > summary/notes > body text). It runs in memory over published records, which is fine at personal scale; switch to Postgres full-text if the archive grows large. Library tags link to a search for that tag.
- Export: `/api/admin/export` (admin download) or `npm run export -- backups/archive.json` (cron-friendly). Contains vocations, records with their vocation links, library, media metadata, skills, education and redirects, with rich text as JSON. **Media files are not inside the JSON: back up `MEDIA_DIR` (or the bucket) alongside it, plus a `pg_dump` for full-fidelity database backups.** There is no import yet.
- SEO: canonical URLs, Open Graph (first body image used as the share image), JSON-LD on record pages, sitemap with `lastmod`, RSS with `pubDate`, robots (blocks `/admin`, `/api`, `/search`). The footer date is the latest published update.

## Responsive and accessibility notes
- Mobile radial menu (`src/lib/radial.ts`): a quarter-circle fan for up to 4 destinations at the smallest radius where nothing overlaps or leaves the screen (checked for 360/375/414 px wide viewports); with more items (e.g. 5+ vocations) it becomes a scrollable vertical stack. The core button doubles as Back/Close. The full semantic nav stays in the DOM (visually hidden on mobile).
- Desktop nav is grouped (WORK / LIBRARY / SITE) so it scales with more vocations.
- Contrast: all text pairs pass WCAG AA in both themes (lowest: muted text on surface, 4.93:1). Decorative rules stay light; form controls and buttons use a separate `--control` border token (>= 3:1).
- Not verified in a real browser here (no browser available in my sandbox): please spot-check 375/768/1024/1440 px, keyboard focus order and the editor.

## Resumes
A resume version (`resume` + `resume_item`) only references canonical records: pick published Experience/Projects plus Skills and Education (`/admin/profile`), order them, choose section order and length, and optionally write version-specific bullets (blank = the record's own summary). `buildResume()` (`src/lib/resume.ts`) is the single model behind the builder outline, the public page and the PDF. Draft/archived records and unapproved agent-proposed items are excluded. Deleting a record removes it from every resume.

- **PDF** (`src/lib/resume-pdf.ts`, PDFKit): modelled on the popular "Jake's Resume" LaTeX layout: US Letter, 0.5in margins, centred small-caps name, one-line contact row (email/URLs are underlined, clickable links), small-caps section headings over a thin rule, bold title + right-aligned dates, italic organisation + location, compact bullets, unbulleted "Category: items" skill lines, in Computer Modern (CMU Serif, from the `computer-modern` package; falls back to Times). Text is real and selectable (ATS-friendly). "One page" shrinks type/spacing in steps down to 80%; if it still spills, the builder shows a warning. Section order defaults to Education, Experience, Projects, Technical Skills. Separate contact items with `|`.
- **Public resume**: tick "Show this version on /resume" on a *Published* version (only one can be public). `/resume` renders it and `/resume/pdf` serves the PDF; otherwise `/resume` falls back to a plain overview. Admin PDF of any version: `/api/admin/resumes/<id>/pdf`.
- Only one template exists (`classic`, the Jake-style layout); the earlier minimal/editorial/technical idea is deferred.

## Resume agent (`/admin/agent`)
Modes: tailor to a job description, create for a role, rank projects, gap analysis, improve bullets. Code: `src/lib/agent/`.
- **Controlled tools only** (`tools.ts`): `search_projects`, `search_experience`, `get_project`, `get_experience`, `create_resume`, `add_to_resume`, `remove_from_resume`, `rewrite_bullet`, `note_gap`, `generate_pdf`. They read PUBLISHED records and edit only an in-memory proposal. There is no database access, no publishing and no edit of canonical content.
- **Server-side grounding** (`ground.ts`): a bullet is kept only if it quotes evidence that appears verbatim in the source record, every number in it appears in the record, and every capitalised/technical term in it appears in the record. Rejected bullets are listed with the reason. Relevance scores and matched terms are computed by the server, not reported by the model.
- **Human approval**: a run only stores a *proposal* (`agent_run`, with a full tool-call audit log). You review each record, its source link and evidence, edit bullets, then **Apply as draft**: it creates a new draft resume or appends to an existing one. It never publishes, never edits records, and never changes items already on a resume. Applied/discarded runs cannot be applied again.
- **Providers** (isolated, replaceable): with no key, an **offline** provider ranks records by weighted term overlap and proposes verbatim sentences (no model, no cost, no data leaves the server). Set `ANTHROPIC_API_KEY` (and optionally `AGENT_MODEL`) for model-written bullets via `anthropic.ts`; record text and the target are then sent to that provider. If the model call fails, the run falls back to offline. Model text and record text are treated as untrusted data in the system prompt, and validation does not depend on the model obeying it.
- The Anthropic provider is tested with a scripted mock of the API (tool loop, rejected invented bullets, unknown tools, outage fallback), **not** against the live API: please try one real run with your key.

## Media storage
Migration guide to S3/Cloudflare R2: `src/lib/storage/README.md`.

Uploads go through `POST /api/admin/media` (admin-only, Origin-checked; send `Accept: application/json` for JSON). Images are decoded to validate (JPEG/PNG/WebP, 5 MB, 50 MP), auto-oriented, stripped of metadata, and stored with WebP variants at 480/800/1200/1600 px (only widths smaller than the original). They are served from `/media/<key>` with a one-year immutable cache.

Storage sits behind the `MediaStorage` interface (`src/lib/storage/index.ts`: `put`, `get`, `delete`). The database stores keys only, and `mediaUrl(key)` is the single place that builds public URLs. Default driver: local disk at `MEDIA_DIR` (`.data/media`). **On the VPS, point `MEDIA_DIR` at a persistent path and back it up with the database.** To move to S3-compatible storage later: implement `MediaStorage` in `src/lib/storage/s3.ts`, add it to `getStorage()`, set `STORAGE_DRIVER=s3` and `MEDIA_PUBLIC_BASE`, and copy existing files to the bucket under the same keys. No CMS or schema changes needed.

## Status vs. spec
Built: public site, IA, routes, theme without flash, radial nav, visual system, Postgres schema (`db/schema.sql`).
Also built (increment 2): /about, /resume (derived view), sitemap, robots, RSS at /feed.xml, 404. Set SITE_URL in production.
Also built: Google-only admin auth, `/admin` dashboard, vocation CRUD (`/admin/vocations`), project/experience CRUD (`/admin/entries`), media library (`/admin/media`), Tiptap rich-text editor for record bodies, permanent redirects for renamed slugs/vocations, library editors for Essays/Books/Movies/Community (`/admin/library`), public search (`/search`) and admin search (`/admin/search`, includes drafts), JSON export, SEO metadata, resume builder with PDF export and a public resume (`/admin/resumes`), skills/education editor (`/admin/profile`), resume agent (`/admin/agent`).
Not built: CMS editing, WYSIWYG, media uploads, resume builder/PDF, AI agent, search, export. Content now lives in the database; `src/lib/content.ts` is only the seed source (`npm run db:seed -- --force` resets the DB to it).

## Decisions
- Library items share one table (`library_item`) with per-collection field labels (`src/lib/library.ts`). Library links must be http(s)/mailto (checked on save and again on read). Book covers and movie posters are picked from the media library; deleting an image used as a cover or in a body is blocked.
- Redirects: renaming a published record's slug, changing its primary vocation, or renaming a published vocation stores old -> new paths (`redirect_rule`) and answers 308. Chains are collapsed, a path that becomes live again stops redirecting, and a non-primary vocation URL redirects to the canonical one. Drafts create no redirects. Deleting a record or vocation removes the redirects that pointed at it, so those old URLs return a plain 404.
- Experience and Project share one `entry` table (kind column) instead of two. Same fields and CRUD; one canonical record each. `db/spec-schema.sql` is the original full-spec reference.
- Pages are `force-dynamic` for now. Static/ISR with `revalidatePath` on CMS save comes with the CMS.
- `entry.body` is whitelisted Tiptap/ProseMirror JSON (`src/lib/richtext.ts`), sanitized on save and again on render; the public page renders it with a React renderer (no raw HTML). Old string-array bodies are converted on read. Images reference media by key; alt text and responsive `srcset` come from the media library at render time. Deleting an image used in a body is blocked.
- Canonical URL per record: `/<primary-vocation>/<kind>/<slug>`; other vocation pages link to it (no duplicate pages).
- Palette: pale grey + ink + blue accent (readability held up best in both themes).
- Fonts: Hanken Grotesk (UI) + IBM Plex Mono (metadata only), 3 weights total, self-hosted via @fontsource (no Google requests).
- Radial nav: two levels (Work / Library) so it stays uncluttered as vocations grow.
- Vocation slugs share the `/[section]` namespace with library collections; the CMS must reject colliding slugs.

## Next
1. Browser pass (CSP + Google sign-in redirect, editor, widths, keyboard). 2. Draft preview, revision history, per-record SEO fields. 3. Real-key agent run, VPS dry run.
