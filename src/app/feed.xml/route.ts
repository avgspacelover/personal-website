import { library, collections, site } from "@/lib/content";
export const dynamic = "force-static";
const esc = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
export function GET() {
  const items = collections.flatMap((c) => library[c.slug].map((i) =>
    `<item><title>${esc(i.title)}</title><link>${esc(i.url && i.url !== "#" ? i.url : `${site.url}/${c.slug}`)}</link><guid isPermaLink="false">${c.slug}:${esc(i.title)}</guid><category>${c.name}</category><description>${esc(`${i.by}. ${i.note}`)}</description></item>`)).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${site.name} / Library</title><link>${site.url}</link><description>Essays, books, movies, and communities.</description>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
