# Personal Archive

Next.js 14 (App Router) + TypeScript. Static-rendered public site: vocations, Experience/Projects, separate library, System/Light/Dark theme, and a mobile radial navigation with a semantic nav kept in the DOM.

## Run
    npm install && npm run setup && npm run dev

`setup` migrates and seeds placeholder content (first run only: `db:seed` refuses to run on a database that already has content unless you pass `--force`, because seeding deletes content). With no `DATABASE_URL`, an embedded Postgres (PGlite) is used under `.data/`. Set `DATABASE_URL` for real Postgres (same migrations in `drizzle/`). After editing `src/db/schema.ts` run `npm run db:generate`.

Deploying to a VPS: see `DEPLOY.md`. The app has been exercised against both the embedded PGlite and a real PostgreSQL server (all migrations, public pages, admin CRUD, JSONB bodies, redirects, PDF, agent, uploads, export).

## Milestones tab (accomplishments and statistics)
Public page `/milestones` (default name **Accomplishments & Rudimentary Numbers**; rename it in Site settings, the URL stays), edited at `/admin/milestones`:
- **Accomplishments:** title, optional headline figure (e.g. "1st place", "400 stars"), detail, year, optional http(s) link and any number of vocations (many-to-many, like projects). Ones tied to a vocation also appear on that vocation's page. Found by search.
- **Reading and watching by year:** automatic. Library items (essays, books, movies, and the new **Series** collection for TV) have a "year read / watched" field; the page counts published items per year and in total, with a "this year so far" line. Items without that year are not counted.
- **Numbers:** free-form numbers (label, value, period, note, optional link): commits, talks given, anything.
All three honour draft/published status, and the data is in the JSON export.

## Draft preview, revision history, SEO fields (projects and experience)
- **Preview:** "Preview in the public layout" on a record's editor opens `/preview/<id>` (admin only, noindex, blocked in robots.txt). It uses the same `EntryView` component as the public page, for any status, and shows the last *saved* version (not unsaved edits in the editor).
- **History:** every save that actually changes something first stores the previous version (who, when). Re-saving unchanged content stores nothing. The newest 30 are kept per record. **Restore content** brings back title, summary, body, tags, period/phase/location and SEO fields, but deliberately not slug, publish status or vocations (those have side effects: URLs, redirects, visibility). The current content is saved before a restore, so a restore can be undone. Deleting a record deletes its history. Not covered by history: vocations, library items, settings.
- **SEO (optional, blank = automatic):** search/share title (70), description (160, default the summary), social image (a media-library image, default the first body image) and a canonical URL override (http/https only). An override points search engines at the other copy and removes the page from the sitemap.

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
- **Browser-verified** (headless Chromium): no console errors or CSP violations on public pages, login or admin at 375/768/1024/1440 px; no horizontal overflow; hydration, theme cycle/persistence, OS dark mode, keyboard focus rings, mobile menu geometry, and the Tiptap 3 editor (typing, toolbar state, save, public render, reopen). **Not verifiable without internet:** the actual redirect to Google and the OAuth callback; check sign-in once on your real domain.

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
Verified in a real (headless) browser at 375, 768, 1024 and 1440 px: zero horizontal overflow, zero console/CSP errors. Mobile menu: tap targets >= 52 px, no overlaps, nothing off-screen, tap-outside/Escape closes it.
- Mobile radial menu (`src/lib/radial.ts`): a quarter-circle fan for up to 4 destinations at the smallest radius where nothing overlaps or leaves the screen (checked for 360/375/414 px wide viewports); with more items (e.g. 5+ vocations) it becomes a scrollable vertical stack. The core button doubles as Back/Close. The full semantic nav stays in the DOM (visually hidden on mobile).
- Desktop nav is grouped (WORK / LIBRARY / SITE) so it scales with more vocations.
- Contrast: all text pairs pass WCAG AA in both themes (lowest: muted text on surface, 4.93:1). Decorative rules stay light; form controls and buttons use a separate `--control` border token (>= 3:1).
- Not verified in a real browser here (no browser available in my sandbox): please spot-check 375/768/1024/1440 px, keyboard focus order and the editor.

## Resumes
A resume version (`resume` + `resume_item`) only references canonical records: pick published Experience/Projects plus Skills and Education (`/admin/profile`), order them, choose section order and length, and optionally write version-specific bullets (blank = the record's own summary). `buildResume()` (`src/lib/resume.ts`) is the single model behind the builder outline, the public page and the PDF. Draft/archived records and unapproved agent-proposed items are excluded. Deleting a record removes it from every resume.

- **PDF** (`src/lib/resume-pdf.ts`, PDFKit): modelled on the popular "Jake's Resume" LaTeX layout: US Letter, 0.5in margins, centred small-caps name, one-line contact row (email/URLs are underlined, clickable links), small-caps section headings over a thin rule, bold title + right-aligned dates, italic organisation + location, compact bullets, unbulleted "Category: items" skill lines, in Computer Modern (CMU Serif, from the `computer-modern` package; falls back to Times). Text is real and selectable (ATS-friendly). "One page" shrinks type/spacing in steps down to 80%; if it still spills, the builder shows a warning. Section order defaults to Education, Experience, Projects, Technical Skills. Separate contact items with `|`.
- **Public resume**: tick "Show this version on /resume" on a *Published* version (only one can be public). `/resume` renders it and `/resume/pdf` serves the PDF; otherwise `/resume` falls back to a plain overview. Admin PDF of any version: `/api/admin/resumes/<id>/pdf`.
- **Two PDF formats from the same resume version**, always both downloadable: **Single column** (`classic`, the Jake-style layout above) and **Two column** (`deedy`, `src/lib/resume-pdf-deedy.ts`): US Letter, 0.4in margins, large light centred name over a grey contact line and an edge-to-edge rule, a 33% sidebar (Education, Technical Skills) beside a 66% main column (Experience, Projects), light grey uppercase section headings, bold uppercase entry titles with an italic role/tech, grey "dates | place" lines and compact bullets, in Lato and Raleway (the original's fonts; fonts are OFL-licensed npm packages). Columns flow independently and continue on page 2 if needed; "one page" shrinks type in steps like the classic format. Both layouts are modelled on the well-known templates (layout only, no template code copied).
- A version's `template` is just its **default** format (used by `/resume/pdf` with no parameter and by the agent preview). Pick a format explicitly with `?template=classic|deedy` on `/resume/pdf` (public) or `/api/admin/resumes/<id>/pdf` (admin); unknown values fall back to the version's default. The public `/resume` page shows both download buttons; the builder shows page count and fit for each format.

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
1. Real-key agent run and real Google sign-in on your domain. 2. VPS dry run (`DEPLOY.md`). 3. Optional: previews/history for vocations, library and settings; more resume templates; command palette.
