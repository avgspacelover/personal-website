import { and, asc, desc, eq, inArray, max } from "drizzle-orm";
import { getDb, vocation, entry, vocationEntry, libraryItem, mediaAsset, siteSettings, skill, education } from "../db";
import { mediaUrl, variantKeys } from "./storage";
import { collections, type Entry, type LibraryItem, type Vocation } from "./content";
import { docText, toDoc } from "./richtext";
import { parseTerms, score } from "./search";

export async function getVocations(): Promise<Vocation[]> {
  const db = await getDb();
  return db.select({ slug: vocation.slug, name: vocation.name, intro: vocation.intro, updated: vocation.updatedAt }).from(vocation).where(eq(vocation.status, "published")).orderBy(asc(vocation.position));
}

// Published entries with their published vocations (primary first). Data volume is small, so vocation filtering happens in JS.
export async function getEntries(opts: { vocation?: string; kind?: Entry["kind"]; featured?: boolean } = {}): Promise<Entry[]> {
  const db = await getDb();
  const rows = await db.select().from(entry).where(and(eq(entry.status, "published"), opts.kind ? eq(entry.kind, opts.kind) : undefined, opts.featured ? eq(entry.featured, true) : undefined)).orderBy(asc(entry.position));
  const links = await db.select({ entryId: vocationEntry.entryId, slug: vocation.slug }).from(vocationEntry)
    .innerJoin(vocation, eq(vocation.id, vocationEntry.vocationId)).where(eq(vocation.status, "published"))
    .orderBy(desc(vocationEntry.isPrimary), asc(vocationEntry.position));
  const out = rows.map((r): Entry => ({
    id: r.id, slug: r.slug, kind: r.kind, title: r.title, org: r.organization ?? undefined, summary: r.summary, year: r.period, status: r.phase, tech: r.tech,
    body: r.body, location: r.location || undefined, updated: r.updatedAt, vocations: links.filter((l) => l.entryId === r.id).map((l) => l.slug),
  }));
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
  collections.forEach((c, n) => libs[n].forEach((i) => {
    const s = score([[i.title, 5], [i.by, 3], [(i.tags ?? []).join(" "), 3], [i.note, 2], [i.year ?? "", 1]], terms);
    if (s) hits.push({ type: c.name.toUpperCase(), title: i.title, href: `/${c.slug}`, note: i.note, score: s });
  }));
  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, 50);
}

export type Settings = { siteName: string; tagline: string; intro: string; currently: unknown; aboutBody: unknown; contactEmail: string; links: { label: string; url: string }[]; metaDescription: string };
export const SETTINGS_DEFAULTS: Settings = {
  siteName: "Personal Archive", tagline: "Software, systems, and ideas, filed by discipline.",
  intro: "Professional work is organized by vocation. Essays, books, films, and communities live separately in the library.",
  currently: [], aboutBody: [], contactEmail: "", links: [], metaDescription: "Professional work by vocation, and a separate personal library.",
};
const safeUrl = (u: string) => /^(https?:\/\/|mailto:)/i.test(u);
export async function getSettings(): Promise<Settings> {
  const [r] = await (await getDb()).select().from(siteSettings).limit(1);
  if (!r) return SETTINGS_DEFAULTS;
  const links = (Array.isArray(r.links) ? r.links : []).flatMap((l: any) => (l && typeof l.label === "string" && typeof l.url === "string" && safeUrl(l.url) ? [{ label: l.label.slice(0, 40), url: l.url }] : [])).slice(0, 10);
  return { siteName: r.siteName || SETTINGS_DEFAULTS.siteName, tagline: r.tagline || SETTINGS_DEFAULTS.tagline, intro: r.intro || SETTINGS_DEFAULTS.intro, currently: r.currently, aboutBody: r.aboutBody, contactEmail: r.contactEmail, links, metaDescription: r.metaDescription || SETTINGS_DEFAULTS.metaDescription };
}
