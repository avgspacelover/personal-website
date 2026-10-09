import { getAdmin } from "@/lib/auth";
import { buildResume } from "@/lib/resume";
import { renderResumePdf } from "@/lib/resume-pdf";
import { UUID } from "@/lib/slug";
export const dynamic = "force-dynamic";
// Admin preview/download of any version, whatever its status.
export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!(await getAdmin())) return new Response("Unauthorized", { status: 401 });
  const m = UUID.test(params.id) ? await buildResume(params.id) : null;
  if (!m) return new Response("Not found", { status: 404 });
  const r = await renderResumePdf(m);
  return new Response(new Uint8Array(r.buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${(m.fullName || m.name).replace(/[^\w-]+/g, "-")}-Resume.pdf"`, "Cache-Control": "no-store", "X-Resume-Pages": String(r.pages), "X-Resume-Fits": String(r.fits) } });
}
