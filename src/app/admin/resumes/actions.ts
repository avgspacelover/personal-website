"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, education, entry, resume, resumeItem, skill } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { SECTIONS, TEMPLATES } from "@/lib/resume";
import { UUID } from "@/lib/slug";
const STATUS = ["draft", "published", "archived"] as const;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const int = (fd: FormData, k: string) => Number.parseInt(str(fd, k), 10) || 0;
const lines = (s: string) => s.split("\n").map((l) => l.trim().slice(0, 300)).filter(Boolean).slice(0, 8);

export async function createResume(fd: FormData) {
  await requireAdmin();
  const name = str(fd, "name");
  if (!name) redirect("/admin/resumes?error=name");
  const [r] = await (await getDb()).insert(resume).values({ name: name.slice(0, 100), template: TEMPLATES.find((t) => t === fd.get("template")) ?? "minimal" }).returning({ id: resume.id });
  redirect(`/admin/resumes/${r.id}`);
}

export async function saveResume(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  if (!UUID.test(id)) redirect("/admin/resumes");
  if (!str(fd, "name")) redirect(`/admin/resumes/${id}?error=name`);
  const db = await getDb();
  const [es, ss, ds] = await Promise.all([db.select({ id: entry.id, kind: entry.kind }).from(entry).where(eq(entry.status, "published")), db.select({ id: skill.id }).from(skill), db.select({ id: education.id }).from(education)]);
  const rows: (typeof resumeItem.$inferInsert)[] = [];
  const pick = (rid: string, base: Omit<typeof resumeItem.$inferInsert, "resumeId" | "position" | "bullets">) => {
    if (fd.get(`i_${rid}`) === "on") rows.push({ ...base, resumeId: id, position: int(fd, `p_${rid}`), bullets: lines(String(fd.get(`b_${rid}`) ?? "")) });
  };
  for (const e of es) pick(e.id, { section: e.kind, entryId: e.id }); // only published records can be added; unknown ids are ignored
  for (const s of ss) pick(s.id, { section: "skills", skillId: s.id });
  for (const d of ds) pick(d.id, { section: "education", educationId: d.id });
  const sections = SECTIONS.filter((k) => fd.get(`sec_${k}`) === "on").sort((a, b) => int(fd, `secpos_${a}`) - int(fd, `secpos_${b}`));
  await db.transaction(async (tx) => {
    await tx.update(resume).set({
      name: str(fd, "name").slice(0, 100), template: TEMPLATES.find((t) => t === fd.get("template")) ?? "minimal", pages: fd.get("pages") === "multi" ? "multi" : "one",
      fullName: str(fd, "fullName").slice(0, 100), contact: str(fd, "contact").slice(0, 300), headline: str(fd, "headline").slice(0, 600), sections,
      status: STATUS.find((s) => s === fd.get("status")) ?? "draft",
    }).where(eq(resume.id, id));
    await tx.delete(resumeItem).where(eq(resumeItem.resumeId, id));
    if (rows.length) await tx.insert(resumeItem).values(rows);
  });
  redirect(`/admin/resumes/${id}?saved=1`);
}

export async function deleteResume(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  if (!UUID.test(id)) redirect("/admin/resumes");
  if (fd.get("confirm") !== "on") redirect(`/admin/resumes/${id}?error=confirm`);
  await (await getDb()).delete(resume).where(eq(resume.id, id));
  redirect("/admin/resumes");
}
