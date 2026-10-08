import type { MetadataRoute } from "next";
import { collections, entryHref, site } from "@/lib/content";
import { getVocations, getEntries } from "@/lib/queries";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [vocations, entries] = await Promise.all([getVocations(), getEntries()]);
  const paths = ["/", "/about", "/resume", ...vocations.map((v) => `/${v.slug}`), ...collections.map((c) => `/${c.slug}`), ...entries.map(entryHref)];
  const mod = new Map(entries.map((e) => [entryHref(e), e.updated]));
  return paths.map((p) => ({ url: site.url + p, lastModified: mod.get(p) }));
}
