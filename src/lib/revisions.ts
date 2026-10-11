import type { entry } from "../db";
type Row = typeof entry.$inferSelect;
export type Links = { vocationId: string; isPrimary: boolean }[];
// Fixed key order so two snapshots of identical content serialise identically (that is how "nothing changed" is detected).
export function snapOf(r: Row, links: Links) {
  return {
    title: r.title, slug: r.slug, status: r.status, organization: r.organization, location: r.location, summary: r.summary, period: r.period, phase: r.phase,
    tech: r.tech, body: r.body, featured: r.featured, position: r.position, seoTitle: r.seoTitle, seoDescription: r.seoDescription, canonicalUrl: r.canonicalUrl, seoImage: r.seoImage,
    vocations: [...links].sort((a, b) => a.vocationId.localeCompare(b.vocationId)).map((l) => `${l.isPrimary ? "*" : ""}${l.vocationId}`),
  };
}
export type Snap = ReturnType<typeof snapOf>;
// jsonb does not preserve key order, so compare with keys sorted: identical content must never look "changed".
const stable = (v: unknown): unknown => Array.isArray(v) ? v.map(stable) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([x], [y]) => x.localeCompare(y)).map(([k, x]) => [k, stable(x)])) : v;
export const changedFields = (a: Record<string, unknown>, b: Record<string, unknown>) => Object.keys(b).filter((k) => JSON.stringify(stable(a[k])) !== JSON.stringify(stable(b[k])));
// Restoring brings back CONTENT only. Slug, publish status and vocation links are left alone because changing them has side effects (URLs, redirects, visibility).
export const RESTORABLE = ["title", "organization", "location", "summary", "period", "phase", "tech", "body", "featured", "position", "seoTitle", "seoDescription", "canonicalUrl", "seoImage"] as const;
