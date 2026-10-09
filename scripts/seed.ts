import { getMigratedDb, vocation, entry, vocationEntry, libraryItem, skill, education } from "../src/db";
import { vocations, entries, library, skills, education as edu } from "../src/lib/content";
(async () => {
  const db = await getMigratedDb();
  if ((await db.select({ id: vocation.id }).from(vocation).limit(1)).length && !process.argv.includes("--force")) {
    console.error("Refusing to seed: the database already has content (seeding DELETES vocations, records, library, skills and education). Re-run with --force to reset it.");
    process.exit(1);
  }
  for (const t of [vocationEntry, entry, vocation, libraryItem, skill, education]) await db.delete(t);
  const v = await db.insert(vocation).values(vocations.map((x, i) => ({ ...x, position: i, status: "published" as const }))).returning({ id: vocation.id, slug: vocation.slug });
  const vid = new Map(v.map((r) => [r.slug, r.id]));
  for (const [i, e] of entries.entries()) {
    const [row] = await db.insert(entry).values({ kind: e.kind, slug: e.slug, title: e.title, organization: e.org, summary: e.summary, period: e.year, phase: e.status, tech: e.tech, body: e.body, position: i, featured: i < 3, status: "published" }).returning({ id: entry.id });
    await db.insert(vocationEntry).values(e.vocations.map((s, j) => ({ vocationId: vid.get(s)!, entryId: row.id, isPrimary: j === 0, position: j })));
  }
  for (const [c, items] of Object.entries(library))
    if (items.length) await db.insert(libraryItem).values(items.map((i, p) => ({ collection: c, title: i.title, creator: i.by, url: i.url, year: i.year, rating: i.rating, notes: i.note, position: p, status: "published" as const })));
  await db.insert(skill).values(skills.map((s, i) => ({ category: s.category, items: s.items, position: i })));
  await db.insert(education).values(edu.map((d, i) => ({ institution: d.institution, program: d.program, period: d.dates, position: i })));
  console.log("seeded"); process.exit(0);
})();
