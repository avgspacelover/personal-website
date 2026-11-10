import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://seo-check.example";

async function worker() {
  const { getMigratedDb, vocation, entry, vocationEntry, siteSettings } = await import("../src/db");
  const db = await getMigratedDb();
  (globalThis as unknown as { __db?: Promise<unknown> }).__db = Promise.resolve(db);
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  await db.insert(vocation).values({ id: id(1), slug: "software", name: "Software", intro: "Software systems", status: "published" });
  await db.insert(entry).values([
    { id: id(2), kind: "projects", slug: "public-work", title: "Public Work", summary: "A public project.", status: "published", tech: ["TypeScript"] },
    { id: id(3), kind: "projects", slug: "canonical-work", title: "Canonical Work", summary: "Published elsewhere.", canonicalUrl: "https://elsewhere.example/work", status: "published" },
    { id: id(4), kind: "projects", slug: "draft-work", title: "Draft Work", summary: "Must stay private.", status: "draft" },
  ]);
  await db.insert(vocationEntry).values([
    { vocationId: id(1), entryId: id(2), isPrimary: true, position: 0 },
    { vocationId: id(1), entryId: id(3), isPrimary: true, position: 1 },
    { vocationId: id(1), entryId: id(4), isPrimary: true, position: 2 },
  ]);
  await db.insert(siteSettings).values({
    id: "main", siteName: "Test Owner", intro: "Visible homepage introduction.",
    metaDescription: "A site description for default social metadata.",
    links: [{ label: "GitHub", url: "https://github.com/test-owner" }, { label: "Email", url: "mailto:owner@example.com" }],
  });

  const { getSettings } = await import("../src/lib/queries");
  const { aboutMetadata, creativeWorkJsonLd, profilePageJsonLd, resumeMetadata, rootMetadata, serializeJsonLd, websiteJsonLd } = await import("../src/lib/seo");
  const { site } = await import("../src/lib/content");
  const settings = await getSettings();
  const root = rootMetadata(settings, site.url);
  assert.equal((root.metadataBase as URL).href, `${SITE_URL}/`);
  assert.equal(root.description, settings.metaDescription);
  assert.equal(root.openGraph?.title, settings.siteName);
  assert.equal(root.twitter?.title, settings.siteName);

  const about = aboutMetadata(settings, "A clear, visible About page description.");
  assert.equal(about.alternates?.canonical, "/about");
  assert.equal(about.description, "A clear, visible About page description.");
  assert.equal(about.openGraph?.url, "/about");
  assert.equal(resumeMetadata.alternates?.canonical, "/resume");
  assert.equal(resumeMetadata.openGraph?.url, "/resume");

  const website = websiteJsonLd(settings, site.url);
  assert.equal(website["@type"], "WebSite");
  assert.equal(website.url, SITE_URL);
  const graph = profilePageJsonLd(site.url, "Test Owner", settings.links, "owner@example.com");
  assert(Array.isArray(graph), "A named profile should emit both ProfilePage and Person entities.");
  assert.equal(graph[0]["@type"], "ProfilePage");
  assert.deepEqual((graph[0] as Record<string, unknown>).mainEntity, { "@id": `${SITE_URL}/about#person` });
  const person = graph[1] as Record<string, unknown>;
  assert.deepEqual(person.sameAs, ["https://github.com/test-owner"]);
  assert.equal(person.email, "mailto:owner@example.com");
  assert(!Array.isArray(profilePageJsonLd(site.url, undefined, [], "")), "An unnamed profile should not emit a Person entity.");
  const jsonLd = serializeJsonLd({ text: "</script><script>alert(1)</script>" });
  assert(!jsonLd.includes("</script>"), "JSON-LD serialization must escape script-closing input.");
  const work = creativeWorkJsonLd({ title: "Public Work", summary: "A public project.", kind: "projects", slug: "public-work", year: "2026", status: "PUBLISHED", tech: ["TypeScript"], vocations: ["software"], body: [], updated: new Date("2026-01-02T00:00:00.000Z") }, `${SITE_URL}/software/projects/public-work`);
  assert.equal(work["@type"], "CreativeWork");
  assert.equal(work.url, `${SITE_URL}/software/projects/public-work`);
  assert.equal(work.keywords, "TypeScript");

  const { default: robots } = await import("../src/app/robots");
  const rules = robots();
  assert.equal(rules.sitemap, `${SITE_URL}/sitemap.xml`);
  const rule = Array.isArray(rules.rules) ? rules.rules[0] : rules.rules;
  assert.equal(rule.userAgent, "*");
  for (const blocked of ["/admin", "/api", "/search", "/preview"]) assert(rule.disallow?.includes(blocked), `robots.txt must disallow ${blocked}`);
  assert(rule.allow === "/", "robots.txt should allow public routes");

  const { default: sitemap } = await import("../src/app/sitemap");
  const rows = await sitemap();
  const urls = rows.map((row) => row.url);
  for (const publicPath of ["/about", "/resume", "/milestones", "/software", "/books"]) assert(urls.includes(`${SITE_URL}${publicPath}`), `Sitemap should include ${publicPath}.`);
  assert(urls.includes(`${SITE_URL}/software/projects/public-work`), "Sitemap should include published canonical content.");
  assert(!urls.includes(`${SITE_URL}/software/projects/canonical-work`), "Sitemap should omit canonical overrides.");
  assert(!urls.includes(`${SITE_URL}/software/projects/draft-work`), "Sitemap should omit drafts.");
  assert(!urls.includes(`${SITE_URL}/search`), "Sitemap should omit internal search.");
  assert(urls.every((url) => url.startsWith(SITE_URL)), "Sitemap URLs should use SITE_URL.");
  console.log("SEO metadata and discoverability checks passed.");
  console.log(JSON.stringify({ checked: ["root social metadata", "About and Resume canonical/social metadata", "WebSite/ProfilePage/Person/CreativeWork JSON-LD", "safe JSON-LD serialization", "robots.txt", "sitemap published and canonical URLs"] }, null, 2));
  process.exit(0);
}

async function main() {
  if (process.argv[2] === "worker") return worker();
  const dataRoot = path.join(process.cwd(), ".data");
  await mkdir(dataRoot, { recursive: true });
  const temp = await mkdtemp(path.join(dataRoot, "seo-check-"));
  try {
    const worker = spawnSync(process.execPath, [path.join(process.cwd(), "node_modules/tsx/dist/cli.mjs"), process.argv[1], "worker"], {
      cwd: process.cwd(), encoding: "utf8", stdio: "inherit",
      env: { ...process.env, SITE_URL, DATABASE_URL: "", MIGRATE_DATABASE_URL: "", PGLITE_DIR: path.relative(process.cwd(), path.join(temp, "db")) },
    });
    if (worker.error) throw worker.error;
    if (worker.status !== 0) throw new Error(`SEO check worker failed with exit ${worker.status}.`);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
