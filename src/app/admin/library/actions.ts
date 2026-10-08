"use server";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, libraryItem, mediaAsset } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { COLLECTIONS, RECS } from "@/lib/library";
import { UUID } from "@/lib/slug";
const STATUS = ["draft", "published", "archived"] as const;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function saveItem(fd: FormData) {
  await requireAdmin();
  const collection = str(fd, "collection"), cfg = COLLECTIONS[collection];
  if (!cfg) redirect("/admin/library");
  const id = str(fd, "id");
  if (id && !UUID.test(id)) redirect(`/admin/library/${collection}`);
  const back = (e: string): never => redirect(`/admin/library/${collection}/${id || "new"}?error=${e}`);
  const title = str(fd, "title");
  if (!title) back("title");
  const url = cfg.url ? str(fd, "url") : "";
  if (url && !/^(https?:\/\/|mailto:)/i.test(url)) back("url"); // blocks javascript: and other schemes
  const db = await getDb();
  let image: string | null = null;
  if (cfg.image && str(fd, "image")) {
    const [a] = await db.select({ key: mediaAsset.key }).from(mediaAsset).where(eq(mediaAsset.key, str(fd, "image"))).limit(1);
    if (!a) back("image");
    image = a.key;
  }
  const values = {
    collection, title, creator: str(fd, "creator"), url: url || null, year: cfg.year ? str(fd, "year") || null : null, notes: str(fd, "notes"),
    tags: str(fd, "tags").split(",").map((s) => s.trim()).filter(Boolean), image,
    position: Number.parseInt(str(fd, "position"), 10) || 0, status: STATUS.find((s) => s === fd.get("status")) ?? "draft",
    ...(cfg.rating ? { rating: RECS.find((r) => r === fd.get("rating")) ?? "" } : {}),
  };
  if (id) await db.update(libraryItem).set(values).where(and(eq(libraryItem.id, id), eq(libraryItem.collection, collection)));
  else await db.insert(libraryItem).values(values);
  redirect(`/admin/library/${collection}`);
}
export async function deleteItem(fd: FormData) {
  await requireAdmin();
  const collection = str(fd, "collection"), id = str(fd, "id");
  if (!COLLECTIONS[collection] || !UUID.test(id)) redirect("/admin/library");
  if (fd.get("confirm") !== "on") redirect(`/admin/library/${collection}/${id}?error=confirm`);
  await (await getDb()).delete(libraryItem).where(and(eq(libraryItem.id, id), eq(libraryItem.collection, collection)));
  redirect(`/admin/library/${collection}`);
}
