import type { MetadataRoute } from "next";
import { collections, entryHref, site } from "@/lib/content";
import { getEntries, getLastUpdated, getLibrary, getVocations } from "@/lib/queries";
export const dynamic = "force-dynamic";
const latest = (ds: (Date | undefined)[]) => { const t = ds.flatMap((d) => (d ? [+d] : [])); return t.length ? new Date(Math.max(...t)) : undefined; };
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [vocations, entries, home, ...libs] = await Promise.all([getVocations(), getEntries(), getLastUpdated(), ...collections.map((c) => getLibrary(c.slug))]);
  const row = (path: string, lastModified?: Date) => ({ url: site.url + path, lastModified });
  return [
    row("/", home ?? undefined), row("/about"), row("/resume", latest(entries.map((e) => e.updated))), row("/search"),
    ...vocations.map((v) => row(`/${v.slug}`, latest([v.updated, ...entries.filter((e) => e.vocations.includes(v.slug)).map((e) => e.updated)]))),
    ...collections.map((c, n) => row(`/${c.slug}`, latest(libs[n].map((i) => i.updated)))),
    ...entries.map((e) => row(entryHref(e), e.updated)),
  ].filter((r) => r.url !== site.url + "/search");
}
