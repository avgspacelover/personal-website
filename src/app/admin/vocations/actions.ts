"use server";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { getDb, vocation } from "@/db";
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
  if (id) await db.update(vocation).set({ name, slug, intro, position, status }).where(eq(vocation.id, id));
  else await db.insert(vocation).values({ name, slug, intro, position, status });
  redirect("/admin/vocations");
}

export async function deleteVocation(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  if (!UUID.test(id)) redirect("/admin/vocations");
  if (fd.get("confirm") !== "on") redirect(`/admin/vocations/${id}?error=confirm`);
  await (await getDb()).delete(vocation).where(eq(vocation.id, id));
  redirect("/admin/vocations");
}
