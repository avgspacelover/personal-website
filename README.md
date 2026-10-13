# Personal Archive: Project Overview

A self-hosted personal website, content management system (CMS), knowledge library and resume generator in one Next.js application. This document explains what exists today, how it is built, what to settle before hosting it, and what is still open.

Companion documents in the repository: `README-1.md` (feature notes and decisions), `DEPLOY.md` (VPS deployment guide), `src/lib/storage/README.md` (moving media to S3 or Cloudflare R2).

---

## 1. What this is

The site is a **structured personal archive**, not a portfolio template. Professional work is organised by **vocation** (Software, Machine Learning, Design, Marketing, Distributed Systems, Compilers, and any you add later). Personal recommendations (essays, books, movies, series, communities) live in a **separate library**. Accomplishments and counted figures have their own page. A **resume** is generated from the same records, never retyped.

**Core ideas**

| Idea | What it means in practice |
|---|---|
| Vocation-first | Experience and Projects belong to vocations (many-to-many). Each vocation is a real landing page. New vocations are created in the admin without code changes. |
| One canonical record | A project is stored once, can appear under several vocations, and has a single canonical URL (its primary vocation's). |
| Library is independent | Essays, Books, Movies, Series and Community have no required link to professional work. |
| Resume is derived | A resume version only *references* records and optionally adds version-specific bullets. It never copies content. |
| Human stays in control | The AI agent can only *propose*. Nothing is applied until you approve, and it can never edit canonical content or publish. |
| Restrained design | "New-age retro minimalism": about 70% modern minimalism, 20% retro/editorial structure, 10% playful personality. |

---

## 2. Status at a glance

**Built and verified:** public site, CMS, rich-text editor, media library, library editors, milestones page, resume builder with two PDF formats, public resume, AI resume agent (offline provider verified; model provider verified against a mock), search, export, SEO, theme system, security hardening, audit log, revision history, draft preview, site settings.

**Not yet done (yours to run, needs credentials or a server):** real Google sign-in on a real domain, a live-API agent run, a VPS dry run, restoring from a backup, and your own visual review.

**Not built (optional or deferred):** see section 9.

How it was verified: ad hoc scripts against a production build, a real PostgreSQL server, and a headless Chromium browser (details in section 7). There is **no automated test suite committed to the repo**.

---

## 3. Product features

### 3.1 Public site

| Route | Purpose |
|---|---|
| `/` | Index, not a hero page: headline and intro (editable), vocations list with record counts, optional "Currently" block, selected (featured) work, library entry points, "Elsewhere" links and contact |
| `/<vocation>` | A vocation's landing page: intro, its Experience, its Projects, and its Accomplishments |
| `/<vocation>/<projects\|experience>/<slug>` | Project and experience pages: metadata block (year, organisation, location, domain, technology, status) plus rich-text body |
| `/essays` `/books` `/movies` `/series` `/community` | The personal library: rows with ratings, tags, covers/posters, notes |
| `/milestones` | Accomplishments, reading and watching by year, and free-form numbers (default title **"Accomplishments & Rudimentary Numbers"**, renamable) |
| `/resume` and `/resume/pdf` | Public resume page and PDF download (see 3.4) |
| `/about` | Editable About page, plus "Elsewhere" links |
| `/search` | Public search (published content only); library tags link here |
| `/feed.xml` | RSS for the library |
| `/sitemap.xml` `/robots.txt` | Sitemap with `lastmod`; robots blocks `/admin`, `/api`, `/search`, `/preview` |

Behaviours worth knowing:

- Visiting a record through a non-primary vocation, or via an old slug, returns a **308 redirect** to the canonical URL. Renaming a slug, changing a primary vocation or renaming a vocation records the old path automatically. A redirect never reveals where a now-private record moved.
- Drafts and archived content never appear in pages, search, feed, sitemap, resume or agent input.
- Every page has a canonical URL, Open Graph tags (first body image or a chosen social image), JSON-LD on record pages, and an "updated" footer date derived from the latest published change.

### 3.2 Navigation and responsive design

- **Desktop:** a grouped editorial header: WORK (vocations), LIBRARY (collections), SITE (Resume, Accomplishments tab, About, Search). It scales as vocations are added.
- **Mobile:** a thumb-friendly circular **MENU** control at bottom right. Up to four destinations fan out on a quarter-circle at the smallest radius where nothing overlaps; with more items (for example 6 vocations or 5 library collections) it becomes a scrollable vertical stack with a dimmed backdrop. The core button doubles as Back/Close, tapping outside or pressing Escape closes it, tap targets are at least 52 px, and safe-area insets are respected.
- The full semantic navigation always stays in the document (visually hidden on mobile), so keyboard, screen-reader and crawler access never depend on the radial menu.

### 3.3 Visual design system

- **Palette:** pale grey "paper" background, near-black ink, one blue accent. Dark mode is a deliberate re-interpretation (near-black, soft off-white), not an inversion. Colours are CSS variables.
- **Type:** Hanken Grotesk for reading and UI; IBM Plex Mono only for metadata, dates, labels and system-like annotations. Three font files in total, self-hosted (no Google Fonts requests).
- **Language:** thin rules, rows and lists instead of cards, labels such as `V / 001`, `UPDATED / OCT 2026`, `4 RECORDS`, 0 to 4 px radii, short motion (underline expansion, menu transitions), `prefers-reduced-motion` respected.
- **Theme:** System / Light / Dark. System follows the OS and reacts to changes, an explicit choice persists, and an inline script prevents a flash of the wrong theme.
- **Contrast:** all text pairs pass WCAG AA in both themes (lowest measured: 4.93:1). Dividers are decorative and light; form controls and buttons use a separate border colour at 3:1 or better.

### 3.4 Resume system

- **Builder** (`/admin/resumes`): create named versions (for example "Software Engineer"). Pick which published Experience, Projects, Skills and Education to include, order them, order the sections, choose one-page or multi-page, and optionally write version-specific bullets. Blank bullets fall back to the record's own summary. A live outline and a fit report per format show page counts.
- **Two PDF formats** from the same version, always both downloadable:
  - **Single column** (`classic`): modelled on the popular "Jake's Resume" layout, set in Computer Modern: centred small-caps name, contact row, small-caps headings over rules, bold title with right-aligned dates, italic organisation and place, compact bullets.
  - **Two column** (`deedy`): modelled on the "Deedy CV" layout, set in Lato and Raleway: large light name over a grey contact line and an edge-to-edge rule, a 33% sidebar (Education, Technical Skills) beside a 66% main column (Experience, Projects), grey uppercase headings, bold uppercase entries with an italic role.
  - Both are real, selectable, searchable text (ATS-friendly), with clickable contact links. "One page" shrinks type in steps down to 80% and warns if it still does not fit. Layouts are modelled on the templates; no template code was copied.
- **Public resume:** tick "Show on /resume" on one *Published* version. `/resume` renders it with two download buttons; `/resume/pdf?template=classic|deedy` serves the files. Draft versions are never public. Public PDFs are cached in memory for 60 seconds.
- **Skills and education** are managed on `/admin/profile` (one line per skill category; one line per school). They appear on resumes only, not on public pages.

### 3.5 AI resume agent (`/admin/agent`)

Modes: tailor to a job description, create for a role, rank projects, gap analysis, improve bullets.

- **Controlled tools only:** `search_projects`, `search_experience`, `get_project`, `get_experience`, `create_resume`, `add_to_resume`, `remove_from_resume`, `rewrite_bullet`, `note_gap`, `generate_pdf`. They read *published* records and edit an in-memory proposal. No database access, no publishing, no edits to canonical content.
- **Server-side grounding:** a proposed bullet is kept only if (1) it quotes evidence that appears verbatim in the source record, (2) every number in it appears in the record, and (3) every capitalised or technical term in it appears in the record. Rejected bullets are listed with the reason. Relevance scores are computed by the server, not reported by the model.
- **Human approval:** a run only stores a proposal (with a full log of tool calls). You review each record, its source link and evidence, edit bullets, then **Apply as draft**. That creates or extends a *draft* resume; it never publishes and never changes items already on a resume. Applied or discarded runs cannot be applied again.
- **Providers (replaceable):** with no API key, an **offline** provider ranks records by weighted term overlap and proposes verbatim sentences (no model, no cost, no data leaves your server). With `ANTHROPIC_API_KEY`, a model writes bullets (record text and your target are then sent to that provider). If the model call fails, the run falls back to offline. Text from job descriptions and records is treated as untrusted data.

### 3.6 Milestones tab (accomplishments and numbers)

Managed at `/admin/milestones`; public at `/milestones`. The tab's name is a setting.

- **Accomplishments:** title, optional headline figure (for example "1st place", "400 stars"), detail, year, optional link, and **any number of vocations** (also shown on each vocation's page). Searchable.
- **Reading and watching by year (automatic):** essays, books, movies and series are counted per year and in total, with a "this year so far" line. Counting uses a "year read / watched" field on library items; items without it are not counted, and drafts are not counted.
- **Numbers:** free-form figures (label, value, period, note, optional link): commits, talks given, anything.

### 3.7 Library (`/admin/library`)

Five collections: Essays, Books, Movies, Series, Community. Each has an editor with fields suited to it (author or director or creator, year published/released, year read/watched, recommendation level, notes, tags, cover or poster from the media library, URL for essays and communities). Links must be http(s) or mailto. Tags link to a site search.

### 3.8 CMS and editing experience

| Area | What it does |
|---|---|
| Vocations | Create, edit, order, publish/archive, delete (confirmation). Slugs are validated against reserved routes and library names. |
| Projects and Experience | One editor for both: title, slug, organisation, location, summary, period, phase, technology, **Tiptap rich-text body**, vocations (many-to-many with a primary), featured, position, status, SEO fields. |
| Rich text | Tiptap 3: headings, bold/italic, lists, quotes, code, links, rules, images (upload, drag-and-drop or pick from the media library), Markdown shortcuts. Stored as whitelisted JSON, sanitised on save and again on render; the public page renders it with React (no raw HTML). Unsaved-changes indicator. |
| Media (`/admin/media`) | Validated uploads (JPEG, PNG, WebP up to 5 MB, 50 MP), EXIF/location stripped, auto-orientation, WebP variants at 480/800/1200/1600 px, alt-text editing, in-use protection on delete. |
| Draft preview | "Preview in the public layout" opens `/preview/<id>`: admin-only, noindex, same component as the public page, any status, last *saved* version. Projects and experience only. |
| Revision history | Each save that changes something first stores the previous version (who, when, what differs). Restore content (not slug, status or vocations); restore itself is undoable. Newest 30 kept per record. Projects and experience only. |
| Per-record SEO | Share title (70), description (160), social image, canonical URL override (an override also removes the page from the sitemap). |
| Site settings | Site name, homepage headline and intro, "Currently" block, About page (rich text), default description, optional public contact email, "Elsewhere" links, name and intro of the Accomplishments tab. |
| Search | `/admin/search` covers everything including drafts and media. |
| Audit log | `/admin/audit` lists sign-ins (allowed and denied) and every admin change. |
| Export | JSON download (`/api/admin/export`) or `npm run export -- file.json`; see 6.4. |

---

## 4. Architecture

### 4.1 Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.4 (App Router, Turbopack build), React 19, TypeScript |
| Rendering | Server-rendered per request (dynamic) with a Node.js `proxy.ts` (formerly middleware) |
| Database | PostgreSQL via Drizzle ORM 0.45 (`postgres` driver). **PGlite** (embedded Postgres) is used automatically when `DATABASE_URL` is unset, for zero-setup local development |
| Migrations | Drizzle Kit; 15 SQL migrations in `drizzle/`; runtime applies them via `npm run db:migrate` |
| Auth | Auth.js v5 (beta) with Google as the only provider; encrypted JWT session cookie |
| Rich text | Tiptap 3 |
| Images | `sharp` |
| PDF | `pdfkit` with Computer Modern (CMU Serif), Lato, Raleway |
| Fonts | `@fontsource` packages (self-hosted) |
| AI | Optional Anthropic Messages API behind a replaceable provider module |

Deliberately **not** used: microservices, queues, Redis, an external CMS, client-side state libraries. It is a well-structured monolith.

### 4.2 Request flow

```
Browser
  |
  v
Reverse proxy (HTTPS, e.g. Caddy)  --- sets X-Forwarded-For (client IP)
  |
  v
Next.js server (Node)
  |-- proxy.ts: rate limit per IP -> 429; per-request CSP nonce + headers
  |-- (site)/*  public pages     -> queries.ts  -> published records only
  |-- admin/*   CMS pages        -> requireAdmin() -> server actions -> DB
  |-- api/admin/* (upload, export, resume PDF)   -> adminEmail() + Origin check
  |-- /media/<key>  immutable image delivery    -> storage driver
  |-- /api/auth/*   Auth.js (Google OAuth)
  |
  +--> PostgreSQL            (content, resumes, audit, sessions are cookies)
  +--> MEDIA_DIR on disk     (or S3/R2 later, via the storage interface)
  +--> Anthropic API         (only if ANTHROPIC_API_KEY is set; server-side)
```

### 4.3 Code map

```
src/
  app/
    layout.tsx                 html shell, theme init script (carries CSP nonce)
    (site)/                    public site: layout (nav, footer, radial menu), pages, preview, resume, search
    admin/                     CMS: vocations, entries, library, media, milestones, resumes,
                               profile, agent, settings, audit, search, login (+ actions.ts per area)
    api/admin/ api/auth/       upload, export, resume PDF, Auth.js
    media/[key]/               public image route
    feed.xml sitemap robots    syndication and SEO
  proxy.ts                     rate limits + CSP nonce
  auth.ts                      Auth.js config (Google, allowlist, 24 h JWT)
  components/                  Radial (mobile menu), Theme toggle, RichEditor, RichText, EntryView, Elsewhere
  db/                          schema.ts, index.ts (PGlite or Postgres; optional separate migration role)
  lib/
    queries.ts, admin-queries.ts   all reads (public reads filter to published)
    richtext.ts                    whitelist sanitiser and JSON helpers
    redirects.ts, revisions.ts     redirect rules; revision snapshots
    media.ts, storage/             image pipeline; MediaStorage interface + local driver
    resume.ts                      the single resume model
    resume-pdf.ts / resume-pdf-deedy.ts   the two PDF layouts
    agent/                         tools, grounding validator, offline + Anthropic providers
    search.ts, export.ts, library.ts, radial.ts, slug.ts, audit.ts, auth.ts, allowlist.ts
drizzle/        SQL migrations         scripts/   migrate, seed, export
```

### 4.4 Data model

| Table | Purpose |
|---|---|
| `vocation` | Professional areas (slug, name, intro, position, status) |
| `entry` | **Projects and Experience in one table** (`kind` column): title, slug, organisation, location, summary, period, phase, tech, rich-text `body` (jsonb), featured, position, status, SEO fields |
| `vocation_entry` | Many-to-many with `is_primary` (decides the canonical URL) |
| `library_item` | Essays, Books, Movies, Series, Community (creator, URL, year, finished year, rating, notes, tags, cover/poster) |
| `accomplishment`, `accomplishment_vocation`, `stat` | Milestones page content (accomplishments are many-to-many with vocations) |
| `skill`, `education` | Resume-only source data |
| `resume`, `resume_item` | Versions and their references to records, with optional per-version bullets and agent flags |
| `agent_run` | Each agent proposal, provider, status and the full tool-call log |
| `media_asset` | Uploaded images: storage key, size, dimensions, alt text, variant widths |
| `redirect_rule` | Old path to current path (308) |
| `revision` | Previous versions of entries |
| `audit_log` | Sign-ins and admin actions |
| `site_settings` | Single row of site-wide text |

Statuses on content are `draft`, `published`, `archived`; only `published` is public.

### 4.5 Key design decisions and trade-offs

| Decision | Why | Cost or caveat |
|---|---|---|
| Projects and Experience share one table | Nearly identical fields; one CRUD path; one canonical record | Slightly different from the original two-entity spec |
| Pages render per request, not statically | The nonce-based CSP needs fresh HTML per request; measured server response was 18 to 34 ms locally with about 4 KB of compressed HTML | No CDN caching of HTML. Images and static assets are immutable-cached |
| Google-only sign-in with an email allowlist | No passwords to store or leak; allowlist re-checked every request | Depends on Google; Auth.js v5 is still a beta line |
| Stateless JWT sessions (24 h) | Simple, no session table | A copied token stays valid until it expires unless you change `ADMIN_EMAILS`, rotate `AUTH_SECRET` or set `SESSIONS_VALID_AFTER` |
| Local-disk media behind a `MediaStorage` interface | Works on a VPS at no cost; S3/R2 later without schema or CMS changes | Needs a persistent, backed-up directory |
| Agent is offline-first | Useful with no API key, no cost, no data leaving the server | Model-written wording needs a key |
| Resume derived from records | One source of truth | Deleting a record removes it from every resume |
| Upgrade to Next 16 | All Next 14.x releases are flagged by `npm audit`; fixes are in 16 | Required code migration (async params, `proxy.ts`, Tiptap 3) |

### 4.6 Security architecture

- **Authentication and authorisation:** Google OAuth only; verified email must be in `ADMIN_EMAILS`; every admin page, server action and route handler authorises server-side (layouts are not a security boundary). Cookies are HttpOnly, SameSite and Secure over HTTPS.
- **CSRF:** Next's built-in Origin check for server actions; explicit Origin checks on upload/export routes; Auth.js tokens on its own endpoints.
- **Headers:** per-request nonce Content-Security-Policy (inline scripts need the nonce; `frame-ancestors 'none'`; `form-action` allows Google sign-in), nosniff, frame denial, referrer and permissions policies, COOP, HSTS in production, no `X-Powered-By`.
- **Rate limits** (per IP per minute, in memory): `/api/auth` 30, `/admin/login` 20, `/search` 30, `/resume/pdf` 6, everything 600.
- **Input handling:** every text field is length-capped; rich text is whitelisted; link schemes are allowlisted (http/https/mailto only); bodies are limited to 500 KB; uploads are decoded and size-limited; storage keys are random and pattern-checked (no path traversal); SVG is rejected.
- **Data access:** optional two-role Postgres setup (`MIGRATE_DATABASE_URL` owner for migrations, data-only `DATABASE_URL` for the running app).
- **Accountability:** audit log of sign-ins and admin actions; `SESSIONS_VALID_AFTER` signs everyone out.
- **Privacy:** no analytics or trackers; self-hosted fonts; no third-party requests except Google sign-in (and the optional model provider).
- **Dependencies:** `npm audit --omit=dev` reported 0 vulnerabilities at the last check; a few moderate advisories exist in a development-only tool (`esbuild` via `drizzle-kit`).

---

## 5. Configuration

### 5.1 Environment variables (`.env.example`)

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Production | Postgres connection for the running app. Unset = embedded PGlite in `.data/` (dev only) |
| `MIGRATE_DATABASE_URL` | Optional | Schema-owner role used only by `db:migrate` / `db:seed`; keep it out of the service's environment |
| `SITE_URL` | Yes | Public base URL (sitemap, feed, canonical, Open Graph) |
| `AUTH_URL` | Production | Same as the public URL |
| `AUTH_SECRET` | Yes | Signs and encrypts sessions (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Yes | Google OAuth client. Redirect URI: `<SITE_URL>/api/auth/callback/google` |
| `ADMIN_EMAILS` | Yes | Comma-separated Google accounts allowed into `/admin` |
| `STORAGE_DRIVER`, `MEDIA_DIR` | Yes | `local` and a persistent directory (default `.data/media`) |
| `MEDIA_PUBLIC_BASE` | Optional | CDN or bucket URL once media moves to object storage |
| `ANTHROPIC_API_KEY`, `AGENT_MODEL` | Optional | Enables model-written resume bullets (default model `claude-sonnet-5-5`) |
| `SESSIONS_VALID_AFTER` | Optional | ISO date; sessions issued before it stop working |
| `CSP_REPORT_ONLY` | Optional | `1` = log CSP violations instead of blocking (debugging) |

### 5.2 npm scripts

| Script | Use |
|---|---|
| `npm run dev` / `build` / `start` | Development, production build, production server |
| `npm run db:generate` | Create a migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Load placeholder content. **Refuses on a database that already has content unless `--force`, because it deletes content** |
| `npm run setup` | `db:migrate` + `db:seed` (first run only) |
| `npm run export -- file.json` | Write the JSON export (cron-friendly) |

Node 20.9 or newer is required.

---

## 6. Things to keep in mind before hosting

### 6.1 Where it can and cannot run

- **Works well:** a single VPS (about 1 GB RAM), with Node, PostgreSQL and a reverse proxy (`DEPLOY.md` has a systemd unit, a Caddyfile, a backup script and an update recipe).
- **GitHub Pages:** cannot host it (static files only; this app needs a server, database, auth and uploads). GitHub is fine for the source code.
- **Netlify or other serverless hosts:** possible in principle but not drop-in, and untested. It would need an external Postgres (for example Neon's free plan), a different media driver (local disk does not persist), a smaller upload cap (serverless request bodies are limited to about 6 MB), bundling the PDF fonts explicitly, and an understanding that the in-memory rate limiter and PDF cache do not work across serverless instances.
- **Free-tier details change.** Check each provider's current limits and sign-up requirements (for example whether a payment method is needed) before you rely on them.

### 6.2 Settle these first

1. **A domain and HTTPS.** Admin cookies are `Secure` in production, so HTTPS is required.
2. **A Google OAuth client** with your domain's redirect URI. While the OAuth app is in "Testing", only listed test users can sign in; add your own email, or publish the app (basic profile and email scopes normally need no review, but check Google's current rules).
3. **A strong `AUTH_SECRET`, and the allowlist** (`ADMIN_EMAILS`) set exactly.
4. **Postgres with two roles** (owner for migrations, data-only for the app) as in `DEPLOY.md`.
5. **A persistent `MEDIA_DIR`** writable by the app user, included in backups.
6. **Backups, with a tested restore:** the database (`pg_dump`), the media directory, and your `.env`. The JSON export is a portable content copy but **does not contain image files, resumes, agent runs or the audit log**, and there is no import feature.
7. **Never run `db:seed --force` on a live site.** It deletes content. Plain `db:seed` refuses on a non-empty database.
8. **Replace placeholders:** seeded vocations, projects, library entries, skills, education; the About page; Site settings; contact email (shown only if you set it).
9. **Run `npm audit --omit=dev`** before each deploy and keep dependencies updated. Auth.js v5 is a beta line, so pin and test upgrades.

### 6.3 Operational notes

- **The app must be reachable only through the proxy.** Rate limiting trusts the *last* `X-Forwarded-For` entry (set by Caddy). Someone reaching the app directly could forge it and dodge limits. Bind to `127.0.0.1` and firewall port 3000.
- **Run one process.** Rate limits and the 60-second PDF cache are in memory per process. Several instances would multiply limits and serve slightly stale PDFs; use proxy-level limits if you scale out.
- **Working directory matters.** PDF fonts are read from `node_modules/`, so the service's working directory must be the project root with dependencies installed (`npm ci`).
- **Uploads:** the proxy should allow bodies of at least 8 MB (the app caps images at 5 MB).
- **CSP safety valve:** if anything behaves oddly after deploy, open the browser console. Set `CSP_REPORT_ONLY=1` to log instead of block while you investigate.
- **Signing out everyone:** set `SESSIONS_VALID_AFTER` to the current time and restart. Removing an email from `ADMIN_EMAILS` revokes that person at once.
- **Migrations run as a separate step** (`db:migrate`), not automatically on start. Run them on each update before restarting.
- **Memory and CPU:** `sharp` (images) and `pdfkit` (PDFs) run in the web process. This is fine for one owner and light traffic.
- **Model provider privacy:** with `ANTHROPIC_API_KEY` set, record text and your target text are sent to that provider. Leave the key unset to keep everything on your server.

### 6.4 Backups and portability

- **Authoritative backup:** `pg_dump` + the media directory + `.env`.
- **JSON export** includes vocations, records with their vocation links, library, settings, accomplishments, numbers, media metadata, skills, education and redirects, with rich text as JSON.
- **Moving media to S3, R2 or another S3-compatible store later** needs no schema or CMS change: implement the three-method `MediaStorage` interface, copy files under the same keys, and optionally set `MEDIA_PUBLIC_BASE`. Steps are in `src/lib/storage/README-1.md`.

### 6.5 First-deploy checklist

- [ ] `/admin` redirects to sign-in; your Google account gets in; another account is refused.
- [ ] Sign-in works end to end on the real domain (never verified outside a sandbox).
- [ ] Upload an image; confirm it appears under `MEDIA_DIR` and loads from `/media/...`.
- [ ] Create a vocation and a project; publish; check the public page, sitemap and canonical URL use your real domain.
- [ ] Mark a resume as public; download both PDFs; open them and check fonts and layout.
- [ ] Browser console is clean (no CSP violations) on public and admin pages.
- [ ] Take a backup and restore it somewhere to prove the process works.
- [ ] Check `/admin/audit` shows your sign-in.

---

## 7. How it was verified (and what was not)

**Verified**

- Production builds on Next 16; a real PostgreSQL server with all 15 migrations; a data-only database role (it could not drop, create or alter tables).
- Authentication: anonymous, forged cookie, and non-allowlisted-token cases are refused; revocation by cutoff works.
- Security: CSP nonce present on all 12 executable scripts of tested pages, rate limits return 429 at the expected counts, field caps, scheme allowlists, upload validation and traversal blocking.
- Features end to end: CRUD for each content type, redirects, history and restore, preview, SEO tags, search, export, milestones counts, both PDF formats (parsed back for text, fonts, links, column positions), public resume gating, agent grounding with a scripted model, outage fallback and apply/approve rules.
- A **real browser** (headless Chromium): no console or CSP errors and no horizontal overflow at 375, 768, 1024 and 1440 px; theme toggle and persistence; OS dark mode; keyboard focus rings; mobile menu geometry; the editor (typing, toolbar state, save, public render, reopen). One real bug (the editor's hidden field being reset) was found and fixed this way.

**Not verified**

- The actual Google redirect and callback (needs internet and real credentials).
- The Anthropic provider against the live API (only a scripted mock).
- A real VPS deployment with systemd and Caddy.
- Admin screens at phone width; a full visual review by you; a formal accessibility audit with assistive technology.
- Restoring from a backup.

**Not in the repo:** an automated test suite and linting. My checks were throwaway scripts, so regressions are currently caught only by manual testing.

---

## 8. Known limitations

- Preview, revision history and per-record SEO exist for **projects and experience only** (not vocations, library items, milestones or settings). History has restore but no side-by-side diff. Deleting a record deletes its history.
- The Accomplishments tab's URL (`/milestones`) and admin path (`/admin/milestones`) keep the old name; only the label is renamable.
- Reading counts include only items where "year read/watched" is filled in.
- Search runs in memory over published records (fine at personal scale; switch to Postgres full-text if the archive grows large).
- Only two resume formats exist (Single column, Two column); the original idea of Minimal, Editorial and Technical templates is deferred.
- Skills and education appear on resumes only.
- Sessions are stateless JWTs: individual sessions cannot be revoked server-side before they expire (see 4.5).
- No analytics, no command palette, no skip-to-content link, no page transitions or hover reveals beyond the basics.
- Library items have RSS but project and experience pages do not.
- `next build` prints three harmless Turbopack warnings about dynamic file paths (media, fonts, database directory).

---

## 9. Pending next steps

### 9.1 Before launch (needs you)

1. **Test real Google sign-in** on your domain (and check the console for CSP blocks).
2. **Do the VPS dry run** from `DEPLOY.md`, including HTTPS, systemd, the two Postgres roles and the first-deploy checklist above.
3. **Set up backups and test a restore.**
4. **Replace all placeholder content** and fill in Site settings, the About page and Milestones.
5. **Do your own visual pass** at phone, tablet and desktop widths, including admin on a phone.
6. **If you want model-written bullets:** add an API key and do one real agent run.
7. **Run `npm audit --omit=dev`** immediately before deploying.

### 9.2 Worth doing soon

- Add an **automated test suite and CI** (the current checks are manual) and a linter.
- Extend **preview, revision history and SEO fields** to vocations, library items, milestones and settings.
- Add the **skip-to-content link** and run an accessibility audit (axe plus keyboard and screen-reader pass).
- A small **homepage teaser** for the Accomplishments tab (for example this year's counts).
- Persist **rate limiting** in the database or the proxy if you ever run more than one process.

### 9.3 Optional

- More resume templates (Minimal, Editorial, Technical) and per-version tweaks.
- Command palette for fast navigation in the admin.
- Privacy-friendly analytics, if you decide you want any.
- Page transitions and hover reveals; RSS for projects and experience.
- Side-by-side diff in history; per-session revocation (database-backed sessions).
- A JSON import (decided not needed for now; the database dump is the real backup).
- Moving media to object storage and a CDN if you leave a single-server setup.
- A Netlify-style deployment path (external Postgres, Blobs or S3 driver, smaller upload cap), if you ever want one.

### 9.4 If something breaks

| Symptom | First thing to check |
|---|---|
| Blank or unstyled page after deploy | Browser console for CSP violations; try `CSP_REPORT_ONLY=1` |
| Cannot sign in | `AUTH_URL`/`SITE_URL`, the Google redirect URI, `ADMIN_EMAILS`, and whether the OAuth app is in Testing without your email as a test user |
| 429 responses | Rate limits; check that the proxy sets `X-Forwarded-For` and the app is not exposed directly |
| PDFs fail or use wrong fonts | The service working directory and that `npm ci` ran there (fonts are read from `node_modules/`) |
| Images missing | `MEDIA_DIR` path, permissions, and that it is the same directory after a redeploy |
| Seeded placeholder content reappeared | Someone ran `db:seed --force`; restore from backup |

---

## 10. Where to read more

- `README-1.md`: feature notes and the reasoning behind decisions.
- `DEPLOY.md`: step-by-step VPS guide, security notes and backup script.
- `src/lib/storage/README.md`: switching media storage to S3 or Cloudflare R2.
- `src/db/schema.ts`: the full data model. `drizzle/`: the migration history.
- `src/proxy.ts`: rate limits and CSP. `src/auth.ts` and `src/lib/auth.ts`: authentication and authorisation.
