import { adminEmail } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { buildExport } from "@/lib/export";
export const dynamic = "force-dynamic";
export async function GET() {
  const who = await adminEmail();
  if (!who) return new Response("Unauthorized", { status: 401 });
  await audit(who, "export.download");
  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(await buildExport(), null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="archive-export-${day}.json"`, "Cache-Control": "no-store" } });
}
