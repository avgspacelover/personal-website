import { NextResponse } from "next/server";
import { getAdmin, sameOrigin } from "@/lib/auth";
import { MAX_BYTES, MediaError, ingestImage } from "@/lib/media";
import { mediaUrl } from "@/lib/storage";

// Used by the media library form now and by the editor's drag-and-drop later (send Accept: application/json).
export async function POST(req: Request) {
  const json = (req.headers.get("accept") ?? "").includes("application/json");
  const fail = (status: number, message: string, code: string) =>
    json ? NextResponse.json({ error: message }, { status }) : NextResponse.redirect(new URL(`/admin/media?error=${code}`, req.url), 303);
  if (!sameOrigin(req)) return new Response("Forbidden", { status: 403 });
  if (!(await getAdmin())) return json ? NextResponse.json({ error: "Unauthorized" }, { status: 401 }) : NextResponse.redirect(new URL("/admin/login", req.url), 303);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES + 256 * 1024) return fail(413, "File exceeds 5 MB.", "size");
  try {
    const fd = await req.formData();
    const file = fd.get("file");
    if (!(file instanceof File) || !file.size) return fail(400, "No file provided.", "file");
    const row = await ingestImage(Buffer.from(await file.arrayBuffer()), file.name, String(fd.get("alt") ?? "").trim());
    if (!json) return NextResponse.redirect(new URL("/admin/media", req.url), 303);
    return NextResponse.json({ id: row.id, url: mediaUrl(row.key), width: row.width, height: row.height, variants: row.variants, alt: row.alt });
  } catch (e) {
    if (e instanceof MediaError) return fail(e.status, e.message, e.status === 413 ? "size" : "type");
    console.error(e); return fail(500, "Upload failed.", "failed");
  }
}
