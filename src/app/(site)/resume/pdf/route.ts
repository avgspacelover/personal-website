import { TEMPLATES, buildResume, publicResumeId } from "@/lib/resume";
import { renderResumePdf } from "@/lib/resume-pdf";
export const dynamic = "force-dynamic";
// Rendering a PDF costs CPU, so each public format is cached in memory for 60 s (changes show up within a minute).
const cache = new Map<string, { at: number; buffer: Buffer; name: string; template: string }>();
// Public download: only the version that is Published AND marked public. ?template=classic|deedy picks the format (default: the version's own).
export async function GET(req: Request) {
  const id = await publicResumeId();
  if (!id) return new Response("Not found", { status: 404 });
  const asked = new URL(req.url).searchParams.get("template") ?? "";
  const key = `${id}|${(TEMPLATES as readonly string[]).includes(asked) ? asked : "default"}`;
  let hit = cache.get(key);
  if (!hit || Date.now() - hit.at > 60_000) {
    const m = await buildResume(id);
    if (!m) return new Response("Not found", { status: 404 });
    const r = await renderResumePdf(m, asked);
    hit = { at: Date.now(), buffer: r.buffer, name: (m.fullName || m.name).replace(/[^\w-]+/g, "-"), template: String(r.template) };
    if (cache.size > 8) cache.clear();
    cache.set(key, hit);
  }
  return new Response(new Uint8Array(hit.buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${hit.name}${hit.template === "deedy" ? "-two-column" : ""}-Resume.pdf"`, "Cache-Control": "public, max-age=300" } });
}
