"use server";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, accomplishment, stat, vocation } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { UUID } from "@/lib/slug";
const STATUS = ["draft", "published", "archived"] as const;
const str = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);
const pickStatus = (fd: FormData) => STATUS.find((s) => s === fd.get("status")) ?? "draft";
const num = (fd: FormData) => Number.parseInt(str(fd, "position", 6), 10) || 0;
const okUrl = (u: string) => !u || (u.length <= 500 && /^https?:\/\//i.test(u)); // scheme allowlist blocks javascript: and friends

export async function saveAccomplishment(fd: FormData) {
  await requireAdmin("saveAccomplishment");
  const id = str(fd, "id", 40), back = (e: string): never => redirect(`/admin/milestones/accomplishments/${id || "new"}?error=${e}`);
  if (id && !UUID.test(id)) redirect("/admin/milestones");
  const title = str(fd, "title", 200), url = str(fd, "url", 501);
  if (!title) back("title");
  if (!okUrl(url)) back("url");
  const db = await getDb(), vid = str(fd, "vocationId", 40);
  const vocationId = UUID.test(vid) && (await db.select({ id: vocation.id }).from(vocation).where(eq(vocation.id, vid)).limit(1)).length ? vid : null;
  const v = { title, detail: str(fd, "detail", 600), year: str(fd, "year", 20), figure: str(fd, "figure", 40), url: url || null, vocationId, position: num(fd), status: pickStatus(fd) };
  if (id) await db.update(accomplishment).set(v).where(eq(accomplishment.id, id)); else await db.insert(accomplishment).values(v);
  redirect("/admin/milestones");
}
export async function saveStat(fd: FormData) {
  await requireAdmin("saveStat");
  const id = str(fd, "id", 40), back = (e: string): never => redirect(`/admin/milestones/stats/${id || "new"}?error=${e}`);
  if (id && !UUID.test(id)) redirect("/admin/milestones");
  const label = str(fd, "label", 80), value = str(fd, "value", 40), url = str(fd, "url", 501);
  if (!label || !value) back("required");
  if (!okUrl(url)) back("url");
  const v = { label, value, period: str(fd, "period", 30), note: str(fd, "note", 200), url: url || null, position: num(fd), status: pickStatus(fd) };
  const db = await getDb();
  if (id) await db.update(stat).set(v).where(eq(stat.id, id)); else await db.insert(stat).values(v);
  redirect("/admin/milestones");
}
export async function deleteMilestone(fd: FormData) {
  await requireAdmin("deleteMilestone");
  const kind = str(fd, "kind", 20), id = str(fd, "id", 40);
  if (!UUID.test(id) || !["accomplishments", "stats"].includes(kind)) redirect("/admin/milestones");
  if (fd.get("confirm") !== "on") redirect(`/admin/milestones/${kind}/${id}?error=confirm`);
  const db = await getDb();
  if (kind === "stats") await db.delete(stat).where(eq(stat.id, id)); else await db.delete(accomplishment).where(and(eq(accomplishment.id, id)));
  redirect("/admin/milestones");
}
