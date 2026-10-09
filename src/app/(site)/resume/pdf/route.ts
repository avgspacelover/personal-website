import { buildResume, publicResumeId } from "@/lib/resume";
import { renderResumePdf } from "@/lib/resume-pdf";
export const dynamic = "force-dynamic";
// Public download: only the version that is Published AND marked public.
export async function GET() {
  const id = await publicResumeId();
  const m = id ? await buildResume(id) : null;
  if (!m) return new Response("Not found", { status: 404 });
  const r = await renderResumePdf(m);
  return new Response(new Uint8Array(r.buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${(m.fullName || m.name).replace(/[^\w-]+/g, "-")}-Resume.pdf"`, "Cache-Control": "public, max-age=300" } });
}
