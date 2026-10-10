"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, education, skill } from "@/db";
import { requireAdmin } from "@/lib/auth";
const lines = (fd: FormData, k: string) => String(fd.get(k) ?? "").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 60);

// Rows are matched by name (category / institution) so ids, and therefore resume selections, survive edits. Removing a line removes the row.
export async function saveProfile(fd: FormData) {
  await requireAdmin("saveProfile");
  const skills = lines(fd, "skills").flatMap((l, position) => {
    const [cat, ...rest] = l.split(":"), items = rest.join(":").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 40);
    return cat.trim() && items.length ? [{ category: cat.trim().slice(0, 80), items, position }] : [];
  });
  const edu = lines(fd, "education").flatMap((l, position) => {
    const [institution, program = "", period = "", location = ""] = l.split("|").map((s) => s.trim());
    return institution ? [{ institution: institution.slice(0, 150), program: program.slice(0, 150), period: period.slice(0, 50), location: location.slice(0, 100), position }] : [];
  });
  await (await getDb()).transaction(async (tx) => {
    const es = await tx.select().from(skill), keepS = new Set<string>();
    for (const s of skills) { const m = es.find((e) => e.category.toLowerCase() === s.category.toLowerCase() && !keepS.has(e.id)); if (m) { keepS.add(m.id); await tx.update(skill).set(s).where(eq(skill.id, m.id)); } else await tx.insert(skill).values(s); }
    for (const e of es) if (!keepS.has(e.id)) await tx.delete(skill).where(eq(skill.id, e.id));
    const ed = await tx.select().from(education), keepE = new Set<string>();
    for (const d of edu) { const m = ed.find((e) => e.institution.toLowerCase() === d.institution.toLowerCase() && !keepE.has(e.id)); if (m) { keepE.add(m.id); await tx.update(education).set(d).where(eq(education.id, m.id)); } else await tx.insert(education).values(d); }
    for (const e of ed) if (!keepE.has(e.id)) await tx.delete(education).where(eq(education.id, e.id));
  });
  redirect("/admin/profile?saved=1");
}
