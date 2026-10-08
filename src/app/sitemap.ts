import type { MetadataRoute } from "next";
import { vocations, collections, entries, entryHref, site } from "@/lib/content";
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/about", "/resume", ...vocations.map((v) => `/${v.slug}`), ...collections.map((c) => `/${c.slug}`), ...entries.map(entryHref)];
  return paths.map((p) => ({ url: site.url + p }));
}
