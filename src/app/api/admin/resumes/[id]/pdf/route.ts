import { getAdmin } from "@/lib/auth";
import { buildResume } from "@/lib/resume";
import { renderResumePdf } from "@/lib/resume-pdf";
import { UUID } from "@/lib/slug";
export const dynamic = "force-dynamic";
// Admin preview/download of any version, whatever its status.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) { const params = await ctx.params;
  if (!(await getAdmin())) return new Response("Unauthorized", { status: 401 });
  const m = UUID.test(params.id) ? await buildResume(params.id) : null;
  if (!m) return new Response("Not found", { status: 404 });
  const r = await renderResumePdf(m, new URL(req.url).searchParams.get("template") ?? undefined);
  return new Response(new Uint8Array(r.buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${(m.fullName || m.name).replace(/[^\w-]+/g, "-")}${r.template === "deedy" ? "-two-column" : ""}-Resume.pdf"`, "Cache-Control": "no-store", "X-Resume-Pages": String(r.pages), "X-Resume-Template": String(r.template), "X-Resume-Fits": String(r.fits) } });
}
