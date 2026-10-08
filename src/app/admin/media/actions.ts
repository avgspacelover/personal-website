"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, mediaAsset } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { variantKeys } from "@/lib/media";
import { getStorage } from "@/lib/storage";
import { UUID } from "@/lib/slug";

export async function updateAlt(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (UUID.test(id)) await (await getDb()).update(mediaAsset).set({ alt: String(fd.get("alt") ?? "").trim().slice(0, 500) }).where(eq(mediaAsset.id, id));
  redirect("/admin/media");
}
export async function deleteMedia(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!UUID.test(id)) redirect("/admin/media");
  if (fd.get("confirm") !== "on") redirect("/admin/media?error=confirm");
  const db = await getDb();
  const [a] = await db.select().from(mediaAsset).where(eq(mediaAsset.id, id)).limit(1);
  if (a) { await getStorage().delete([a.key, ...variantKeys(a.key, a.variants)]); await db.delete(mediaAsset).where(eq(mediaAsset.id, id)); }
  redirect("/admin/media");
}
