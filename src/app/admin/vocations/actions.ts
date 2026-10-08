"use server";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { getDb, entry, vocation, vocationEntry, type DB } from "@/db";
import { addRedirects, removeRedirectsTo } from "@/lib/redirects";
import { requireAdmin } from "@/lib/auth";
import { UUID, slugError, slugify } from "@/lib/slug";

const STATUS = ["draft", "published", "archived"] as const;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function saveVocation(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const name = str(fd, "name");
  const slug = slugify(str(fd, "slug") || name);
  const status = STATUS.find((s) => s === fd.get("status")) ?? "draft";
  const position = Number.parseInt(str(fd, "position"), 10) || 0;
  const intro = str(fd, "intro");
  const back = (e: string): never => redirect(`/admin/vocations/${id || "new"}?error=${e}`);
  if (id && !UUID.test(id)) redirect("/admin/vocations");
  if (!name) back("name");
  const bad = slugError(slug);
  if (bad) back(bad);
  const db = await getDb();
  const clash = await db.select({ id: vocation.id }).from(vocation).where(and(eq(vocation.slug, slug), id ? ne(vocation.id, id) : undefined)).limit(1);
  if (clash.length) back("taken");
  if (id) {
    const [old] = await db.select({ slug: vocation.slug, status: vocation.status }).from(vocation).where(eq(vocation.id, id)).limit(1);
    if (!old) redirect("/admin/vocations");
    await db.transaction(async (tx) => {
      await tx.update(vocation).set({ name, slug, intro, position, status }).where(eq(vocation.id, id));
      if (old.status === "published" && old.slug !== slug) {
        // The vocation page and every record whose primary vocation this is change URL together.
        const owned = await tx.select({ kind: entry.kind, slug: entry.slug }).from(vocationEntry).innerJoin(entry, eq(entry.id, vocationEntry.entryId)).where(and(eq(vocationEntry.vocationId, id), eq(vocationEntry.isPrimary, true)));
        await addRedirects(tx as unknown as DB, [[`/${old.slug}`, `/${slug}`], ...owned.map((e): [string, string] => [`/${old.slug}/${e.kind}/${e.slug}`, `/${slug}/${e.kind}/${e.slug}`])]);
      }
    });
  } else await db.insert(vocation).values({ name, slug, intro, position, status });
  redirect("/admin/vocations");
}

export async function deleteVocation(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  if (!UUID.test(id)) redirect("/admin/vocations");
  if (fd.get("confirm") !== "on") redirect(`/admin/vocations/${id}?error=confirm`);
  const db = await getDb();
  const [v] = await db.select({ slug: vocation.slug }).from(vocation).where(eq(vocation.id, id)).limit(1);
  await db.transaction(async (tx) => {
    await tx.delete(vocation).where(eq(vocation.id, id));
    if (v) await removeRedirectsTo(tx as unknown as DB, `/${v.slug}`, true);
  });
  redirect("/admin/vocations");
}
