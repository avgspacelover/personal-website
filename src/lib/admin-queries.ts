import { count } from "drizzle-orm";
import { getDb, entry, vocation, libraryItem } from "../db";
export async function getCounts() {
  const db = await getDb();
  const [e, v, l] = await Promise.all([
    db.select({ kind: entry.kind, status: entry.status, n: count() }).from(entry).groupBy(entry.kind, entry.status),
    db.select({ status: vocation.status, n: count() }).from(vocation).groupBy(vocation.status),
    db.select({ collection: libraryItem.collection, status: libraryItem.status, n: count() }).from(libraryItem).groupBy(libraryItem.collection, libraryItem.status),
  ]);
  return { e, v, l };
}

import { libraryItem as lib, mediaAsset } from "../db";
import { docText, toDoc } from "./richtext";
import { parseTerms, score } from "./search";
export type AdminHit = { type: string; title: string; href: string; status: string; score: number };
// Searches everything, drafts and archived included.
export async function searchAdmin(q: string): Promise<AdminHit[]> {
  const terms = parseTerms(q);
  if (!terms.length) return [];
  const db = await getDb();
  const [vs, es, ls, ms] = await Promise.all([db.select().from(vocation), db.select().from(entry), db.select().from(lib), db.select().from(mediaAsset)]);
  const hits: AdminHit[] = [];
  const add = (type: string, title: string, href: string, status: string, s: number) => { if (s) hits.push({ type, title, href, status, score: s }); };
  for (const v of vs) add("VOCATION", v.name, `/admin/vocations/${v.id}`, v.status, score([[v.name, 5], [v.slug, 3], [v.intro, 2]], terms));
  for (const e of es) add(e.kind === "projects" ? "PROJECT" : "EXPERIENCE", e.title, `/admin/entries/${e.id}`, e.status, score([[e.title, 5], [e.slug, 3], [e.organization ?? "", 3], [e.tech.join(" "), 3], [e.summary, 2], [docText(toDoc(e.body)), 1]], terms));
  for (const l of ls) add(l.collection.toUpperCase(), l.title, `/admin/library/${l.collection}/${l.id}`, l.status, score([[l.title, 5], [l.creator, 3], [l.tags.join(" "), 3], [l.notes, 2]], terms));
  for (const m of ms) add("MEDIA", m.name || m.key, "/admin/media", "-", score([[m.name, 4], [m.alt, 3]], terms));
  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, 100);
}
