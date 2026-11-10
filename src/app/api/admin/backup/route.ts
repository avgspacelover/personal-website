import { adminEmail, sameOrigin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { BackupError, buildBackup, readBounded, restoreBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function GET() {
  const who = await adminEmail();
  if (!who) return new Response("Unauthorized", { status: 401 });
  await audit(who, "backup.download");
  try {
    const data = await buildBackup();
    const day = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(data), { headers: { "Content-Type": "application/gzip", "Content-Disposition": `attachment; filename=\"personal-archive-${day}.pabackup\"`, "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof BackupError ? error.message : "Backup could not be created.";
    return Response.json({ error: message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const who = await adminEmail();
  if (!who) return new Response("Unauthorized", { status: 401 });
  try {
    const archive = await readBounded(request);
    const result = await restoreBackup(archive);
    await audit(who, "backup.restore", `${Object.values(result.tables).reduce((a, b) => a + b, 0)} rows; ${result.files} files`);
    return Response.json({ ok: true, tables: result.tables, files: result.files }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof BackupError ? error.message : "Restore failed; the target must be empty and no data was imported.";
    return Response.json({ error: message }, { status: error instanceof BackupError ? 400 : 500, headers: { "Cache-Control": "no-store" } });
  }
}
