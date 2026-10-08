import { getAdmin } from "@/lib/auth";
import { buildExport } from "@/lib/export";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!(await getAdmin())) return new Response("Unauthorized", { status: 401 });
  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(await buildExport(), null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="archive-export-${day}.json"`, "Cache-Control": "no-store" } });
}
