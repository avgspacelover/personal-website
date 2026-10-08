import { getDb, vocation, entry, vocationEntry, libraryItem, mediaAsset, skill, education, redirectRule } from "../db";
// Full structured export. Rich text stays as ProseMirror JSON. Media FILES are not included (copy MEDIA_DIR separately); keys tie them to records.
export async function buildExport() {
  const db = await getDb();
  const [vocs, entries, links, lib, media, skills, edu, redirects] = await Promise.all([
    db.select().from(vocation), db.select().from(entry), db.select().from(vocationEntry), db.select().from(libraryItem),
    db.select().from(mediaAsset), db.select().from(skill), db.select().from(education), db.select().from(redirectRule),
  ]);
  const slug = new Map(vocs.map((v) => [v.id, v.slug]));
  return {
    format: "personal-archive-export", version: 1, exportedAt: new Date().toISOString(),
    vocations: vocs.map(({ id, ...v }) => ({ ...v, id })),
    entries: entries.map((e) => ({ ...e, vocations: links.filter((l) => l.entryId === e.id).sort((a, b) => a.position - b.position).map((l) => ({ slug: slug.get(l.vocationId), primary: l.isPrimary })) })),
    library: lib, media, skills, education: edu, redirects,
  };
}
