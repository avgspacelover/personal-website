import { buildResume, publicResumeId } from "@/lib/resume";
import { renderResumePdf } from "@/lib/resume-pdf";
export const dynamic = "force-dynamic";
// Rendering a PDF costs CPU, so the public one is cached in memory for 60 s (changes show up within a minute).
let cache: { id: string; at: number; buffer: Buffer; name: string } | null = null;
// Public download: only the version that is Published AND marked public.
export async function GET() {
  const id = await publicResumeId();
  if (!id) return new Response("Not found", { status: 404 });
  if (!cache || cache.id !== id || Date.now() - cache.at > 60_000) {
    const m = await buildResume(id);
    if (!m) return new Response("Not found", { status: 404 });
    cache = { id, at: Date.now(), buffer: (await renderResumePdf(m)).buffer, name: (m.fullName || m.name).replace(/[^\w-]+/g, "-") };
  }
  return new Response(new Uint8Array(cache.buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${cache.name}-Resume.pdf"`, "Cache-Control": "public, max-age=300" } });
}
