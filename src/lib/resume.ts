import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb, education, entry, resume, resumeItem, skill, vocation, vocationEntry } from "../db";

export const SECTIONS = ["education", "experience", "projects", "skills"] as const;
export const TEMPLATES = ["classic"] as const;
export type RItem = { title: string; sub?: string; period?: string; location?: string; meta?: string; bullets: string[]; href?: string };
export type RSection = { key: string; title: string; items: RItem[] };
export type ResumeModel = { id: string; name: string; template: string; pages: string; fullName: string; contact: string; headline: string; sections: RSection[] };
const TITLES: Record<string, string> = { experience: "Experience", projects: "Projects", skills: "Technical Skills", education: "Education" };

// One model feeds the builder outline, the public page and the PDF. Only PUBLISHED canonical records and APPROVED items are included;
// an item without its own bullets falls back to the canonical summary, so the source record stays the single source of truth.
export async function buildResume(id: string): Promise<ResumeModel | null> {
  const db = await getDb();
  const [r] = await db.select().from(resume).where(eq(resume.id, id)).limit(1);
  if (!r) return null;
  const items = await db.select().from(resumeItem).where(and(eq(resumeItem.resumeId, id), eq(resumeItem.approved, true))).orderBy(asc(resumeItem.position));
  const ids = (f: (i: typeof items[number]) => string | null) => items.flatMap((i) => (f(i) ? [f(i)!] : []));
  const [es, ss, ds, links] = await Promise.all([
    ids((i) => i.entryId).length ? db.select().from(entry).where(and(inArray(entry.id, ids((i) => i.entryId)), eq(entry.status, "published"))) : [],
    ids((i) => i.skillId).length ? db.select().from(skill).where(inArray(skill.id, ids((i) => i.skillId))) : [],
    ids((i) => i.educationId).length ? db.select().from(education).where(inArray(education.id, ids((i) => i.educationId))) : [],
    db.select({ entryId: vocationEntry.entryId, slug: vocation.slug }).from(vocationEntry).innerJoin(vocation, eq(vocation.id, vocationEntry.vocationId)).where(eq(vocationEntry.isPrimary, true)),
  ]);
  const sections: RSection[] = r.sections.filter((k) => (SECTIONS as readonly string[]).includes(k)).map((key) => ({
    key, title: TITLES[key],
    items: items.filter((i) => i.section === key).flatMap((i): RItem[] => {
      if (i.entryId) { const e = es.find((x) => x.id === i.entryId); if (!e) return []; const p = links.find((l) => l.entryId === e.id);
        return [{ title: e.title, sub: e.organization ?? undefined, period: e.period || undefined, location: e.location || undefined, meta: e.kind === "projects" ? e.tech.join(", ") || undefined : undefined, bullets: i.bullets.length ? i.bullets : e.summary ? [e.summary] : [], href: p ? `/${p.slug}/${e.kind}/${e.slug}` : undefined }]; }
      if (i.skillId) { const s = ss.find((x) => x.id === i.skillId); return s ? [{ title: s.category, sub: s.items.join(", "), bullets: [] }] : []; }
      const d = ds.find((x) => x.id === i.educationId); return d ? [{ title: d.institution, sub: d.program || undefined, period: d.period || undefined, location: d.location || undefined, bullets: i.bullets }] : [];
    }),
  })).filter((s) => s.items.length);
  return { id: r.id, name: r.name, template: TEMPLATES.find((t) => t === r.template) ?? "classic", pages: r.pages, fullName: r.fullName, contact: r.contact, headline: r.headline, sections };
}

export async function publicResumeId() {
  const [r] = await (await getDb()).select({ id: resume.id }).from(resume).where(and(eq(resume.isPublic, true), eq(resume.status, "published"))).limit(1);
  return r?.id ?? null;
}
