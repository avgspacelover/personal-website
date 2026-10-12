import { collections } from "./content";
// Vocation slugs share the top-level URL namespace with fixed routes and library collections.
const RESERVED = new Set(["admin", "api", "about", "resume", "feed.xml", "sitemap.xml", "robots.txt", "_next", "media", "search", "preview", "milestones"]);
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export function slugError(slug: string): "invalid" | "reserved" | null {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return "invalid";
  return RESERVED.has(slug) || collections.some((c) => c.slug === slug) ? "reserved" : null;
}
