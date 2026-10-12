import { and, asc, count, desc, eq, inArray, max } from "drizzle-orm";
import { getDb, vocation, entry, vocationEntry, libraryItem, mediaAsset, siteSettings, skill, education } from "../db";
import { mediaUrl, variantKeys } from "./storage";
import { collections, type Accomplishment, type Entry, type LibraryItem, type Stat, type Vocation } from "./content";
import { docText, toDoc } from "./richtext";
import { parseTerms, score } from "./search";

export async function getVocations(): Promise<Vocation[]> {
  const db = await getDb();
  return db.select({ slug: vocation.slug, name: vocation.name, intro: vocation.intro, updated: vocation.updatedAt }).from(vocation).where(eq(vocation.status, "published")).orderBy(asc(vocation.position));
}

// Published entries with their published vocations (primary first). Data volume is small, so vocation filtering happens in JS.
const toEntry = (r: typeof entry.$inferSelect, vocations: string[]): Entry => ({
  id: r.id, slug: r.slug, kind: r.kind, title: r.title, org: r.organization ?? undefined, summary: r.summary, year: r.period, status: r.phase, tech: r.tech,
  body: r.body, location: r.location || undefined, updated: r.updatedAt, vocations,
  seoTitle: r.seoTitle || undefined, seoDescription: r.seoDescription || undefined, seoImage: r.seoImage ?? undefined, canonical: r.canonicalUrl || undefined,
});
// Admin preview only: any publish status, any vocation status.
export async function getEntryAnyStatus(id: string) {
  const db = await getDb();
  const [r] = await db.select().from(entry).where(eq(entry.id, id)).limit(1);
  if (!r) return null;
  const links = await db.select({ slug: vocation.slug }).from(vocationEntry).innerJoin(vocation, eq(vocation.id, vocationEntry.vocationId)).where(eq(vocationEntry.entryId, id)).orderBy(desc(vocationEntry.isPrimary), asc(vocationEntry.position));
  return { entry: toEntry(r, links.map((l) => l.slug)), publishStatus: r.status };
}
export async function getEntries(opts: { vocation?: string; kind?: Entry["kind"]; featured?: boolean } = {}): Promise<Entry[]> {
  const db = await getDb();
  const rows = await db.select().from(entry).where(and(eq(entry.status, "published"), opts.kind ? eq(entry.kind, opts.kind) : undefined, opts.featured ? eq(entry.featured, true) : undefined)).orderBy(asc(entry.position));
  const links = await db.select({ entryId: vocationEntry.entryId, slug: vocation.slug }).from(vocationEntry)
    .innerJoin(vocation, eq(vocation.id, vocationEntry.vocationId)).where(eq(vocation.status, "published"))
    .orderBy(desc(vocationEntry.isPrimary), asc(vocationEntry.position));
  const out = rows.map((r) => toEntry(r, links.filter((l) => l.entryId === r.id).map((l) => l.slug)));
  return opts.vocation ? out.filter((e) => e.vocations.includes(opts.vocation!)) : out.filter((e) => e.vocations.length > 0);
}

export async function getEntry(kind: string, slug: string) {
  return (await getEntries()).find((e) => e.kind === kind && e.slug === slug);
}

export async function getLibrary(collection: string): Promise<LibraryItem[]> {
  const db = await getDb();
  const rows = await db.select().from(libraryItem).where(and(eq(libraryItem.collection, collection), eq(libraryItem.status, "published"))).orderBy(asc(libraryItem.position));
  const keys = rows.flatMap((r) => (r.image ? [r.image] : []));
  const assets = new Map((keys.length ? await db.select().from(mediaAsset).where(inArray(mediaAsset.key, keys)) : []).map((a) => [a.key, a]));
  return rows.map((r): LibraryItem => {
    const a = r.image ? assets.get(r.image) : undefined;
    return { title: r.title, by: r.creator, note: r.notes, rating: r.rating, year: r.year ?? undefined, tags: r.tags, updated: r.updatedAt,
      url: r.url && /^(https?:\/\/|mailto:)/i.test(r.url) ? r.url : undefined, // never render other schemes as links
      image: a ? { url: mediaUrl(a.variants.includes(480) ? variantKeys(a.key, [480])[0] : a.key), alt: a.alt } : undefined };
  });
}

export async function getSkills() {
  return (await getDb()).select({ category: skill.category, items: skill.items }).from(skill).orderBy(asc(skill.position));
}
export async function getEducation() {
  const rows = await (await getDb()).select().from(education).orderBy(asc(education.position));
  return rows.map((d) => ({ institution: d.institution, program: d.program, dates: d.period }));
}

export async function getLastUpdated(): Promise<Date | null> {
  const db = await getDb();
  const rows = await Promise.all([
    db.select({ d: max(entry.updatedAt) }).from(entry).where(eq(entry.status, "published")),
    db.select({ d: max(libraryItem.updatedAt) }).from(libraryItem).where(eq(libraryItem.status, "published")),
    db.select({ d: max(vocation.updatedAt) }).from(vocation).where(eq(vocation.status, "published")),
    db.select({ d: max(accomplishment.updatedAt) }).from(accomplishment).where(eq(accomplishment.status, "published")),
    db.select({ d: max(stat.updatedAt) }).from(stat).where(eq(stat.status, "published")),
  ]);
  const ds = rows.flatMap((r) => (r[0]?.d ? [new Date(r[0].d as unknown as string).getTime()] : []));
  return ds.length ? new Date(Math.max(...ds)) : null;
}

export type Hit = { type: string; title: string; href: string; note: string; score: number };
// Published content only. In-memory scoring is fine at personal-archive scale; swap for Postgres full-text search if it ever is not.
export async function searchPublic(q: string): Promise<Hit[]> {
  const terms = parseTerms(q);
  if (!terms.length) return [];
  const [vocs, entries, ...libs] = await Promise.all([getVocations(), getEntries(), ...collections.map((c) => getLibrary(c.slug))]);
  const names = new Map(vocs.map((v) => [v.slug, v.name]));
  const hits: Hit[] = [];
  for (const v of vocs) { const s = score([[v.name, 5], [v.intro, 2]], terms); if (s) hits.push({ type: "VOCATION", title: v.name, href: `/${v.slug}`, note: v.intro, score: s }); }
  for (const e of entries) {
    const s = score([[e.title, 5], [e.org ?? "", 3], [e.tech.join(" "), 3], [e.summary, 2], [e.vocations.map((v) => names.get(v) ?? "").join(" "), 2], [docText(toDoc(e.body)), 1]], terms);
    if (s) hits.push({ type: e.kind === "projects" ? "PROJECT" : "EXPERIENCE", title: e.title, href: `/${e.vocations[0]}/${e.kind}/${e.slug}`, note: e.summary, score: s });
  }
  for (const a of await getAccomplishments()) { const s = score([[a.title, 5], [a.vocations.map((v) => v.name).join(" "), 3], [a.figure, 3], [a.detail, 2], [a.year, 1]], terms); if (s) hits.push({ type: "ACCOMPLISHMENT", title: a.title, href: "/milestones", note: a.detail, score: s }); }
  collections.forEach((c, n) => libs[n].forEach((i) => {
    const s = score([[i.title, 5], [i.by, 3], [(i.tags ?? []).join(" "), 3], [i.note, 2], [i.year ?? "", 1]], terms);
    if (s) hits.push({ type: c.name.toUpperCase(), title: i.title, href: `/${c.slug}`, note: i.note, score: s });
  }));
  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, 50);
}

export type Settings = { milestonesTitle: string; milestonesIntro: string; siteName: string; tagline: string; intro: string; currently: unknown; aboutBody: unknown; contactEmail: string; links: { label: string; url: string }[]; metaDescription: string };
export const SETTINGS_DEFAULTS: Settings = {
  milestonesTitle: "Accomplishments & Rudimentary Numbers", milestonesIntro: "Things I have done, and a few counted things, kept up to date by hand.",
  siteName: "Personal Archive", tagline: "Software, systems, and ideas, filed by discipline.",
  intro: "Professional work is organized by vocation. Essays, books, films, and communities live separately in the library.",
  currently: [], aboutBody: [], contactEmail: "", links: [], metaDescription: "Professional work by vocation, and a separate personal library.",
};
const safeUrl = (u: string) => /^(https?:\/\/|mailto:)/i.test(u);
export async function getSettings(): Promise<Settings> {
  const [r] = await (await getDb()).select().from(siteSettings).limit(1);
  if (!r) return SETTINGS_DEFAULTS;
  const links = (Array.isArray(r.links) ? r.links : []).flatMap((l: any) => (l && typeof l.label === "string" && typeof l.url === "string" && safeUrl(l.url) ? [{ label: l.label.slice(0, 40), url: l.url }] : [])).slice(0, 10);
  return { milestonesTitle: r.milestonesTitle || SETTINGS_DEFAULTS.milestonesTitle, milestonesIntro: r.milestonesIntro || SETTINGS_DEFAULTS.milestonesIntro, siteName: r.siteName || SETTINGS_DEFAULTS.siteName, tagline: r.tagline || SETTINGS_DEFAULTS.tagline, intro: r.intro || SETTINGS_DEFAULTS.intro, currently: r.currently, aboutBody: r.aboutBody, contactEmail: r.contactEmail, links, metaDescription: r.metaDescription || SETTINGS_DEFAULTS.metaDescription };
}

import { accomplishment, accomplishmentVocation, stat } from "../db";
const httpUrl = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : undefined);
export async function getAccomplishments(opts: { vocation?: string } = {}): Promise<Accomplishment[]> {
  const db = await getDb();
  const rows = await db.select().from(accomplishment).where(eq(accomplishment.status, "published")).orderBy(asc(accomplishment.position), desc(accomplishment.year));
  const links = await db.select({ aid: accomplishmentVocation.accomplishmentId, slug: vocation.slug, name: vocation.name }).from(accomplishmentVocation)
    .innerJoin(vocation, eq(vocation.id, accomplishmentVocation.vocationId)).where(eq(vocation.status, "published")).orderBy(asc(accomplishmentVocation.position), asc(vocation.position));
  const out = rows.map((a): Accomplishment => ({ id: a.id, title: a.title, detail: a.detail, year: a.year, figure: a.figure, url: httpUrl(a.url), vocations: links.filter((l) => l.aid === a.id).map((l) => ({ slug: l.slug, name: l.name })) }));
  return opts.vocation ? out.filter((x) => x.vocations.some((v) => v.slug === opts.vocation)) : out;
}
export async function getStats(): Promise<Stat[]> {
  const rows = await (await getDb()).select().from(stat).where(eq(stat.status, "published")).orderBy(asc(stat.position), asc(stat.label));
  return rows.map((r) => ({ id: r.id, label: r.label, value: r.value, period: r.period, note: r.note, url: httpUrl(r.url) }));
}
export const READING = ["essays", "books", "movies", "series"] as const;
// Counts of published library items by the year they were read/watched (library_item.finished), newest year first.
export async function getReadingTable() {
  const rows = await (await getDb()).select({ y: libraryItem.finished, c: libraryItem.collection, n: count() }).from(libraryItem)
    .where(and(eq(libraryItem.status, "published"), inArray(libraryItem.collection, [...READING]))).groupBy(libraryItem.finished, libraryItem.collection);
  const by = new Map<string, Record<string, number>>(), totals: Record<string, number> = Object.fromEntries(READING.map((k) => [k, 0]));
  for (const r of rows) {
    if (!r.y) continue;
    const e = by.get(r.y) ?? Object.fromEntries(READING.map((k) => [k, 0])); e[r.c] = r.n; by.set(r.y, e); totals[r.c] += r.n;
  }
  return { years: [...by].sort(([a], [b]) => b.localeCompare(a)).map(([year, v]) => ({ year, ...v }) as { year: string } & Record<string, number>), totals };
}
