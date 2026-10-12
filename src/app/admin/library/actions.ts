"use server";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, libraryItem, mediaAsset } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { COLLECTIONS, RECS } from "@/lib/library";
import { UUID } from "@/lib/slug";
const STATUS = ["draft", "published", "archived"] as const;
const str = (fd: FormData, k: string, max = 2000) => String(fd.get(k) ?? "").trim().slice(0, max);

export async function saveItem(fd: FormData) {
  await requireAdmin("saveItem");
  const collection = str(fd, "collection"), cfg = COLLECTIONS[collection];
  if (!cfg) redirect("/admin/library");
  const id = str(fd, "id");
  if (id && !UUID.test(id)) redirect(`/admin/library/${collection}`);
  const back = (e: string): never => redirect(`/admin/library/${collection}/${id || "new"}?error=${e}`);
  const title = str(fd, "title", 200);
  if (!title) back("title");
  const url = cfg.url ? str(fd, "url", 501) : "";
  if (url && (url.length > 500 || !/^(https?:\/\/|mailto:)/i.test(url))) back("url"); // scheme allowlist also blocks javascript: // blocks javascript: and other schemes
  const finished = cfg.finished ? str(fd, "finished", 4) : "";
  if (finished && !/^\d{4}$/.test(finished)) back("finished");
  const db = await getDb();
  let image: string | null = null;
  if (cfg.image && str(fd, "image")) {
    const [a] = await db.select({ key: mediaAsset.key }).from(mediaAsset).where(eq(mediaAsset.key, str(fd, "image"))).limit(1);
    if (!a) back("image");
    image = a.key;
  }
  const values = {
    collection, title, creator: str(fd, "creator", 200), url: url || null, year: cfg.year ? str(fd, "year", 30) || null : null, finished: finished || null, notes: str(fd, "notes"),
    tags: str(fd, "tags", 600).split(",").map((s) => s.trim().slice(0, 40)).filter(Boolean).slice(0, 15), image,
    position: Number.parseInt(str(fd, "position"), 10) || 0, status: STATUS.find((s) => s === fd.get("status")) ?? "draft",
    ...(cfg.rating ? { rating: RECS.find((r) => r === fd.get("rating")) ?? "" } : {}),
  };
  if (id) await db.update(libraryItem).set(values).where(and(eq(libraryItem.id, id), eq(libraryItem.collection, collection)));
  else await db.insert(libraryItem).values(values);
  redirect(`/admin/library/${collection}`);
}
export async function deleteItem(fd: FormData) {
  await requireAdmin("deleteItem");
  const collection = str(fd, "collection"), id = str(fd, "id");
  if (!COLLECTIONS[collection] || !UUID.test(id)) redirect("/admin/library");
  if (fd.get("confirm") !== "on") redirect(`/admin/library/${collection}/${id}?error=confirm`);
  await (await getDb()).delete(libraryItem).where(and(eq(libraryItem.id, id), eq(libraryItem.collection, collection)));
  redirect(`/admin/library/${collection}`);
}
