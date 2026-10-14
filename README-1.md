# Personal Archive: Implementation Notes

This document supplements [README.md](README.md), the canonical project overview. It records implementation details and design decisions that are useful when maintaining or extending the application. For VPS setup, use [DEPLOY.md](DEPLOY.md); for object storage, use [src/lib/storage/README.md](src/lib/storage/README.md).

## Current shape

The application is a dynamic Next.js App Router monolith using React, TypeScript, Drizzle ORM and PostgreSQL. When `DATABASE_URL` is unset, local development uses PGlite in `.data/pg`. Public pages, the CMS, APIs, media delivery, resume generation and the optional resume agent run in the same Node.js application.

The database is the source of truth for live content. `src/lib/content.ts` contains placeholder seed data, not the runtime content store. `npm run setup` migrates and seeds a fresh local database; seeding an already-populated database is destructive and requires `--force`.

## Data and publishing model

- A `vocation` is a public professional area. Projects and experience share the `entry` table and are distinguished by `kind`.
- `vocation_entry` links entries to multiple vocations. Exactly one selected vocation supplies the canonical path, `/<vocation>/<kind>/<slug>`.
- Library collections share `library_item`, with collection-specific fields described in `src/lib/library.ts`. Library records do not need a professional-vocation link.
- Accomplishments can link to multiple vocations. Reading and watching totals are derived from published library items' `finished` year; free-form figures use `stat`.
- Content statuses are `draft`, `published` and `archived`. Public queries filter to published records. Resume records also require a published resume version before appearing publicly.
- Resume versions reference entries, skills and education instead of copying their source content. Optional bullets belong to that resume version.

## Editing and history

Admin pages, server actions and protected route handlers authorize on the server. `src/lib/auth.ts` centralizes checks. Google sign-in is restricted to verified emails in `ADMIN_EMAILS`; the encrypted JWT session lifetime is 24 hours, as configured in `src/auth.ts`. `SESSIONS_VALID_AFTER` can revoke sessions issued before a chosen timestamp, and removing an email from the allowlist immediately denies subsequent requests.

Projects and experience use a Tiptap editor whose saved JSON is sanitized both on write and render. Supported content is deliberately limited to common text nodes, marks, links and media-library images. Entry saves retain the previous snapshot when content changes; restore brings back content fields while leaving slug, visibility and vocation links unchanged. The newest 30 snapshots per entry are retained.

Renaming a published vocation or changing a published entry's canonical path creates permanent redirects. Redirect resolution checks that the destination remains public, so an old URL does not reveal the new path of unpublished content. Draft and archived entries do not create public redirects.

Preview, revision history and per-entry SEO overrides currently cover projects and experience only. Other content types do not have revision snapshots.

## Resume builder and agent

`src/lib/resume.ts` builds the shared resume model used by the admin outline, public resume and PDF renderers. The two PDF renderers are `src/lib/resume-pdf.ts` (single column) and `src/lib/resume-pdf-deedy.ts` (two column). Both produce selectable text and can render one- or multi-page output.

The resume agent is optional. Without `ANTHROPIC_API_KEY`, it uses local term overlap to rank records and proposes verbatim source sentences. With a key, it sends the target text and relevant record text to Anthropic. Its tools read published records and modify an in-memory proposal; bullet grounding is validated on the server. A human reviews the proposal and applies it through the admin UI. Applying creates or extends a resume, so check the destination resume's status before applying if you need the change to remain private.

The provider integration has been exercised with a scripted mock, not a live Anthropic API request. The live provider path still needs a real-key check if you intend to use it.

## Security and operations

- `src/proxy.ts` applies in-memory per-process rate limits and a per-request nonce Content Security Policy. Run behind the configured reverse proxy and expose the app only through that proxy; it supplies the trusted `X-Forwarded-For` value.
- Protected upload, export and resume-PDF routes perform their own authorization checks. The upload route also checks the request origin; Next.js enforces origin checks for server actions.
- Image uploads are decoded and validated, limited to 5 MB and 50 megapixels, auto-oriented, stripped of metadata and stored with WebP variants. Media keys are random UUID-based names, and the local storage driver rejects invalid keys.
- For a single VPS, local disk storage is appropriate when `MEDIA_DIR` is persistent and backed up. The storage interface is in `src/lib/storage/index.ts`.
- A full backup consists of PostgreSQL data, media files and the production environment configuration. The JSON export is useful for portability but omits media files, resume versions, agent runs and audit history; it is not a full-fidelity restore format.
- Rate limits and the public PDF cache are held in process memory. Keep one app process unless limits and caching are moved to shared infrastructure.

## Verified and remaining work

The project overview in [README.md](README.md) is the source for the current verification record, known limitations and launch checklist. Its reported checks include production builds, migrations against PostgreSQL, authorization and validation paths, content workflows, PDF extraction, agent grounding with a mock, and browser checks at several viewport sizes.

Still dependent on the owner's credentials or server: real Google OAuth on the production domain, a live model-provider run if desired, a VPS rehearsal, and a tested backup restore. The repository does not currently include a repeatable automated test suite or linter. A real accessibility audit and the owner's own visual review also remain useful before launch.

## Extending the project

When adding a content type, update the schema and migration, public and admin queries, server-side validation, editor and listing pages, search, export, sitemap or feeds where relevant, and delete/reference behavior. Keep public reads explicitly scoped to published records and authorize each mutation independently of its layout.

When adding a schema change, edit `src/db/schema.ts`, generate a migration with `npm run db:generate`, inspect the generated SQL, then apply it with `npm run db:migrate`. Production migration credentials should be separate from the app's data-access role.

The original normalized concept schema is retained as a reference in `db/spec-schema.sql`; it is not the live schema. The live schema is `src/db/schema.ts`, and the ordered SQL migrations in `drizzle/` define deployed database changes.
