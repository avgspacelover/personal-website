"use server";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, agentRun, entry, resume, resumeItem } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { runAgent } from "@/lib/agent";
import type { Proposal } from "@/lib/agent/tools";
import { UUID } from "@/lib/slug";
const str = (fd: FormData, k: string, max = 8000) => String(fd.get(k) ?? "").trim().slice(0, max);
const MODES = ["create", "tailor", "gap", "improve", "rank"] as const;
const lines = (s: string) => s.split("\n").map((l) => l.trim().slice(0, 300)).filter(Boolean).slice(0, 6);

export async function startRun(fd: FormData) {
  await requireAdmin("startRun");
  const mode = MODES.find((m) => m === fd.get("mode"));
  const target = str(fd, "target").slice(0, 8000), rid = str(fd, "resumeId");
  if (!mode) redirect("/admin/agent?error=mode");
  if (mode !== "improve" && !target) redirect("/admin/agent?error=target");
  let existingBullets = "";
  if (mode === "improve") {
    if (!UUID.test(rid)) redirect("/admin/agent?error=resume");
    const db = await getDb();
    const items = await db.select({ b: resumeItem.bullets, t: entry.title }).from(resumeItem).innerJoin(entry, eq(entry.id, resumeItem.entryId)).where(eq(resumeItem.resumeId, rid));
    existingBullets = items.flatMap((i) => i.b.map((b) => `${i.t}: ${b}`)).join("\n");
    if (!existingBullets) redirect("/admin/agent?error=nobullets");
  }
  redirect(`/admin/agent/${await runAgent({ mode, target: target || "improve existing bullets", resumeId: UUID.test(rid) ? rid : null, existingBullets })}`);
}

// The ONLY path from a proposal to real data, and it is a human action. It creates or extends a DRAFT resume. It never publishes,
// never edits canonical records, and never changes items already on an existing resume.
export async function applyRun(fd: FormData) {
  await requireAdmin("applyRun");
  const id = str(fd, "id");
  if (!UUID.test(id)) redirect("/admin/agent");
  const db = await getDb();
  const [run] = await db.select().from(agentRun).where(eq(agentRun.id, id)).limit(1);
  if (!run || run.status !== "proposed") redirect(`/admin/agent/${id}`);
  const p = run.proposal as Proposal;
  const chosen = p.picks.filter((x) => fd.get(`pick_${x.id}`) === "on");
  if (!chosen.length) redirect(`/admin/agent/${id}?error=none`);
  const live = new Set((await db.select({ id: entry.id }).from(entry).where(and(inArray(entry.id, chosen.map((x) => x.id)), eq(entry.status, "published")))).map((r) => r.id));
  const target = str(fd, "target");
  const rid = await db.transaction(async (tx) => {
    let resumeId: string, have: { entryId: string | null; position: number }[] = [];
    if (UUID.test(target)) {
      const [r] = await tx.select({ id: resume.id }).from(resume).where(eq(resume.id, target)).limit(1);
      if (!r) return null;
      resumeId = r.id; have = await tx.select({ entryId: resumeItem.entryId, position: resumeItem.position }).from(resumeItem).where(eq(resumeItem.resumeId, r.id));
    } else resumeId = (await tx.insert(resume).values({ name: (str(fd, "name") || p.name || "Agent proposal").slice(0, 100) }).returning({ id: resume.id }))[0].id;
    const start = Math.max(-1, ...have.map((h) => h.position)) + 1, already = new Set(have.map((h) => h.entryId));
    const rows = chosen.filter((x) => live.has(x.id) && !already.has(x.id)).map((x, i) => ({ resumeId, section: x.kind, entryId: x.id, position: start + i, bullets: lines(str(fd, `b_${x.id}`)), proposedByAgent: true, approved: true }));
    if (rows.length) await tx.insert(resumeItem).values(rows);
    await tx.update(agentRun).set({ status: "applied", resumeId }).where(eq(agentRun.id, id));
    return resumeId;
  });
  redirect(rid ? `/admin/resumes/${rid}?saved=1` : `/admin/agent/${id}?error=resume`);
}

export async function discardRun(fd: FormData) {
  await requireAdmin("discardRun");
  const id = str(fd, "id");
  if (UUID.test(id)) await (await getDb()).update(agentRun).set({ status: "discarded" }).where(and(eq(agentRun.id, id), eq(agentRun.status, "proposed")));
  redirect("/admin/agent");
}
