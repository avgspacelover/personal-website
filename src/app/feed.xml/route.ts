import { collections, site } from "@/lib/content";
import { getLibrary, getSettings } from "@/lib/queries";
export const dynamic = "force-dynamic";
const esc = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
export async function GET() {
  const settings = await getSettings();
  const libs = await Promise.all(collections.map((c) => getLibrary(c.slug)));
  const items = collections.flatMap((c, n) => libs[n].map((i) =>
    `<item><title>${esc(i.title)}</title><link>${esc(i.url && i.url !== "#" ? i.url : `${site.url}/${c.slug}`)}</link><guid isPermaLink="false">${c.slug}:${esc(i.title)}</guid><category>${c.name}</category>${i.updated ? `<pubDate>${i.updated.toUTCString()}</pubDate>` : ""}<description>${esc(`${i.by}. ${i.note}`)}</description></item>`)).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(settings.siteName)} / Library</title><link>${site.url}</link><description>${esc(settings.metaDescription)}</description>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
