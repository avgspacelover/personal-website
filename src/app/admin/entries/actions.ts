"use server";
import { redirect } from "next/navigation";
import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb, entry, vocation, vocationEntry } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { UUID, slugify } from "@/lib/slug";
import { parseBody } from "@/lib/richtext";

const STATUS = ["draft", "published", "archived"] as const;
const KINDS = ["projects", "experience"] as const;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function saveEntry(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  if (id && !UUID.test(id)) redirect("/admin/entries");
  const db = await getDb();
  const existing = id ? (await db.select({ kind: entry.kind }).from(entry).where(eq(entry.id, id)).limit(1))[0] : null;
  if (id && !existing) redirect("/admin/entries");
  const kind = existing?.kind ?? KINDS.find((k) => k === fd.get("kind")) ?? "projects"; // kind is fixed after creation
  const title = str(fd, "title");
  const slug = slugify(str(fd, "slug") || title);
  const back = (e: string): never => redirect(`/admin/entries/${id || "new"}?kind=${kind}&error=${e}`);
  if (!title) back("title");
  if (!slug) back("slug");
  const clash = await db.select({ id: entry.id }).from(entry).where(and(eq(entry.kind, kind), eq(entry.slug, slug), id ? ne(entry.id, id) : undefined)).limit(1);
  if (clash.length) back("taken");
  const body = parseBody(str(fd, "body"));
  if (!body) back("body");

  const wanted = fd.getAll("vocations").map(String).filter((v) => UUID.test(v));
  const valid = wanted.length ? (await db.select({ id: vocation.id }).from(vocation).where(inArray(vocation.id, wanted))).map((r) => r.id) : [];
  const primary = valid.includes(str(fd, "primary")) ? str(fd, "primary") : valid[0];
  const values = {
    title, slug, organization: str(fd, "organization") || null, summary: str(fd, "summary"), period: str(fd, "period"), phase: str(fd, "phase"),
    tech: str(fd, "tech").split(",").map((s) => s.trim()).filter(Boolean),
    body,
    position: Number.parseInt(str(fd, "position"), 10) || 0, featured: fd.get("featured") === "on",
    status: STATUS.find((s) => s === fd.get("status")) ?? "draft",
  };
  await db.transaction(async (tx) => {
    const eid = id || (await tx.insert(entry).values({ kind, ...values }).returning({ id: entry.id }))[0].id;
    if (id) await tx.update(entry).set(values).where(eq(entry.id, id));
    await tx.delete(vocationEntry).where(eq(vocationEntry.entryId, eid));
    if (valid.length) await tx.insert(vocationEntry).values(valid.map((v, i) => ({ vocationId: v, entryId: eid, isPrimary: v === primary, position: i })));
  });
  redirect("/admin/entries");
}

export async function deleteEntry(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  if (!UUID.test(id)) redirect("/admin/entries");
  if (fd.get("confirm") !== "on") redirect(`/admin/entries/${id}?error=confirm`);
  await (await getDb()).delete(entry).where(eq(entry.id, id));
  redirect("/admin/entries");
}
