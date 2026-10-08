# Personal Archive

Next.js 14 (App Router) + TypeScript. Static-rendered public site: vocations, Experience/Projects, separate library, System/Light/Dark theme, and a mobile radial navigation with a semantic nav kept in the DOM.

## Run
    npm install && npm run setup && npm run dev

`setup` migrates and seeds. With no `DATABASE_URL`, an embedded Postgres (PGlite) is used under `.data/`. Set `DATABASE_URL` for real Postgres (same migrations in `drizzle/`). After editing `src/db/schema.ts` run `npm run db:generate`.

## Status vs. spec
Built: public site, IA, routes, theme without flash, radial nav, visual system, Postgres schema (`db/schema.sql`).
Also built (increment 2): /about, /resume (derived view), sitemap, robots, RSS at /feed.xml, 404. Set SITE_URL in production.
Not built: CMS + auth, WYSIWYG, media uploads, resume builder/PDF, AI agent, search, export. Content now lives in the database; `src/lib/content.ts` is only the seed source (`npm run db:seed` resets the DB to it).

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
1. Auth.js + `/admin`. 3. Tiptap. 4. Resume + PDF. 5. Agent behind a server service.
