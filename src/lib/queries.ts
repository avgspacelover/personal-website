import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb, vocation, entry, vocationEntry, libraryItem, mediaAsset, skill, education } from "../db";
import { mediaUrl, variantKeys } from "./storage";
import type { Entry, LibraryItem, Vocation } from "./content";

export async function getVocations(): Promise<Vocation[]> {
  const db = await getDb();
  return db.select({ slug: vocation.slug, name: vocation.name, intro: vocation.intro }).from(vocation).where(eq(vocation.status, "published")).orderBy(asc(vocation.position));
}

// Published entries with their published vocations (primary first). Data volume is small, so vocation filtering happens in JS.
export async function getEntries(opts: { vocation?: string; kind?: Entry["kind"]; featured?: boolean } = {}): Promise<Entry[]> {
  const db = await getDb();
  const rows = await db.select().from(entry).where(and(eq(entry.status, "published"), opts.kind ? eq(entry.kind, opts.kind) : undefined, opts.featured ? eq(entry.featured, true) : undefined)).orderBy(asc(entry.position));
  const links = await db.select({ entryId: vocationEntry.entryId, slug: vocation.slug }).from(vocationEntry)
    .innerJoin(vocation, eq(vocation.id, vocationEntry.vocationId)).where(eq(vocation.status, "published"))
    .orderBy(desc(vocationEntry.isPrimary), asc(vocationEntry.position));
  const out = rows.map((r): Entry => ({
    slug: r.slug, kind: r.kind, title: r.title, org: r.organization ?? undefined, summary: r.summary, year: r.period, status: r.phase, tech: r.tech,
    body: r.body, vocations: links.filter((l) => l.entryId === r.id).map((l) => l.slug),
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
    return { title: r.title, by: r.creator, note: r.notes, rating: r.rating, year: r.year ?? undefined, tags: r.tags,
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
