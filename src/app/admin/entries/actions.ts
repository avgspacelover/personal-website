"use server";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray, ne, notInArray } from "drizzle-orm";
import { getDb, entry, mediaAsset, revision, vocation, vocationEntry, type DB } from "@/db";
import { RESTORABLE, changedFields, snapOf } from "@/lib/revisions";
import { sanitizeDoc } from "@/lib/richtext";
import { requireAdmin } from "@/lib/auth";
import { UUID, slugify } from "@/lib/slug";
import { parseBody } from "@/lib/richtext";
import { addRedirects, removeRedirectsTo } from "@/lib/redirects";

const STATUS = ["draft", "published", "archived"] as const;
const KINDS = ["projects", "experience"] as const;
const str = (fd: FormData, k: string, max = 2000) => String(fd.get(k) ?? "").trim().slice(0, max); // every text field is capped

export async function saveEntry(fd: FormData) {
  const who = await requireAdmin("saveEntry");
  const id = str(fd, "id");
  if (id && !UUID.test(id)) redirect("/admin/entries");
  const db = await getDb();
  const existing = id ? (await db.select().from(entry).where(eq(entry.id, id)).limit(1))[0] : null;
  const curLinks = id ? await db.select({ vocationId: vocationEntry.vocationId, isPrimary: vocationEntry.isPrimary }).from(vocationEntry).where(eq(vocationEntry.entryId, id)) : [];
  const oldPrimary = id ? (await db.select({ slug: vocation.slug }).from(vocationEntry).innerJoin(vocation, eq(vocation.id, vocationEntry.vocationId)).where(and(eq(vocationEntry.entryId, id), eq(vocationEntry.isPrimary, true))).limit(1))[0] : null;
  if (id && !existing) redirect("/admin/entries");
  const kind = existing?.kind ?? KINDS.find((k) => k === fd.get("kind")) ?? "projects"; // kind is fixed after creation
  const title = str(fd, "title", 200);
  const slug = slugify(str(fd, "slug", 120) || title).slice(0, 120);
  const back = (e: string): never => redirect(`/admin/entries/${id || "new"}?kind=${kind}&error=${e}`);
  if (!title) back("title");
  if (!slug) back("slug");
  const clash = await db.select({ id: entry.id }).from(entry).where(and(eq(entry.kind, kind), eq(entry.slug, slug), id ? ne(entry.id, id) : undefined)).limit(1);
  if (clash.length) back("taken");
  const body = parseBody(String(fd.get("body") ?? ""));
  if (!body) back("body");

  const canonicalUrl = str(fd, "canonicalUrl", 501);
  if (canonicalUrl && (canonicalUrl.length > 500 || !/^https?:\/\//i.test(canonicalUrl))) back("canonical");
  const seoImageKey = str(fd, "seoImage", 200);
  if (seoImageKey && !(await db.select({ k: mediaAsset.key }).from(mediaAsset).where(eq(mediaAsset.key, seoImageKey)).limit(1)).length) back("seoimage");
  const wanted = fd.getAll("vocations").map(String).filter((v) => UUID.test(v));
  const found = wanted.length ? await db.select({ id: vocation.id, slug: vocation.slug }).from(vocation).where(inArray(vocation.id, wanted)) : [];
  const valid = found.map((r) => r.id);
  const primary = valid.includes(str(fd, "primary")) ? str(fd, "primary") : valid[0];
  const primarySlug = found.find((r) => r.id === primary)?.slug;
  const values = {
    title, slug, organization: str(fd, "organization", 150) || null, location: str(fd, "location", 100), summary: str(fd, "summary", 600), period: str(fd, "period", 50), phase: str(fd, "phase", 50),
    tech: str(fd, "tech", 600).split(",").map((s) => s.trim().slice(0, 40)).filter(Boolean).slice(0, 20),
    body, seoTitle: str(fd, "seoTitle", 70), seoDescription: str(fd, "seoDescription", 160), canonicalUrl, seoImage: seoImageKey || null,
    position: Number.parseInt(str(fd, "position"), 10) || 0, featured: fd.get("featured") === "on",
    status: STATUS.find((s) => s === fd.get("status")) ?? "draft",
  };
  await db.transaction(async (tx) => {
    const eid = id || (await tx.insert(entry).values({ kind, ...values }).returning({ id: entry.id }))[0].id;
    if (id && existing) {
      // Keep the previous version when this save actually changes something (newest 30 kept).
      const before = snapOf(existing, curLinks), after = snapOf({ ...existing, ...values } as typeof existing, valid.map((v) => ({ vocationId: v, isPrimary: v === primary })));
      if (changedFields(before, after).length) {
        await tx.insert(revision).values({ entryId: id, actor: who, snapshot: before });
        const keep = (await tx.select({ id: revision.id }).from(revision).where(eq(revision.entryId, id)).orderBy(desc(revision.at)).limit(30)).map((r) => r.id);
        await tx.delete(revision).where(and(eq(revision.entryId, id), notInArray(revision.id, keep)));
      }
      await tx.update(entry).set(values).where(eq(entry.id, id));
    }
    await tx.delete(vocationEntry).where(eq(vocationEntry.entryId, eid));
    if (valid.length) await tx.insert(vocationEntry).values(valid.map((v, i) => ({ vocationId: v, entryId: eid, isPrimary: v === primary, position: i })));
    // A previously published record whose canonical URL changed keeps answering at the old URL.
    if (id && existing?.status === "published" && oldPrimary && primarySlug) await addRedirects(tx as unknown as DB, [[`/${oldPrimary.slug}/${kind}/${existing.slug}`, `/${primarySlug}/${kind}/${slug}`]]);
  });
  redirect("/admin/entries");
}

export async function deleteEntry(fd: FormData) {
  await requireAdmin("deleteEntry");
  const id = str(fd, "id");
  if (!UUID.test(id)) redirect("/admin/entries");
  if (fd.get("confirm") !== "on") redirect(`/admin/entries/${id}?error=confirm`);
  const db = await getDb();
  const [e] = await db.select({ kind: entry.kind, slug: entry.slug }).from(entry).where(eq(entry.id, id)).limit(1);
  const [p] = await db.select({ slug: vocation.slug }).from(vocationEntry).innerJoin(vocation, eq(vocation.id, vocationEntry.vocationId)).where(and(eq(vocationEntry.entryId, id), eq(vocationEntry.isPrimary, true))).limit(1);
  await db.transaction(async (tx) => {
    await tx.delete(entry).where(eq(entry.id, id));
    if (e && p) await removeRedirectsTo(tx as unknown as DB, `/${p.slug}/${e.kind}/${e.slug}`);
  });
  redirect("/admin/entries");
}

// Brings back the CONTENT of an earlier version (not slug, status or vocations). The current content is saved as a new revision first, so a restore can itself be undone.
export async function restoreRevision(fd: FormData) {
  const who = await requireAdmin("restoreRevision");
  const rid = str(fd, "revisionId");
  if (!UUID.test(rid)) redirect("/admin/entries");
  const db = await getDb();
  const [rev] = await db.select().from(revision).where(eq(revision.id, rid)).limit(1);
  if (!rev) redirect("/admin/entries");
  const [cur] = await db.select().from(entry).where(eq(entry.id, rev.entryId)).limit(1);
  if (!cur) redirect("/admin/entries");
  const links = await db.select({ vocationId: vocationEntry.vocationId, isPrimary: vocationEntry.isPrimary }).from(vocationEntry).where(eq(vocationEntry.entryId, cur.id));
  const s = rev.snapshot as Record<string, any>;
  const text = (k: string, n: number) => String(s[k] ?? "").slice(0, n);
  const img = typeof s.seoImage === "string" ? (await db.select({ k: mediaAsset.key }).from(mediaAsset).where(eq(mediaAsset.key, s.seoImage)).limit(1))[0]?.k ?? null : null;
  const restored = {
    title: text("title", 200) || cur.title, organization: s.organization ? text("organization", 150) : null, location: text("location", 100), summary: text("summary", 600), period: text("period", 50), phase: text("phase", 50),
    tech: (Array.isArray(s.tech) ? s.tech : []).map((t: unknown) => String(t).slice(0, 40)).slice(0, 20), body: sanitizeDoc(s.body), featured: s.featured === true, position: Number(s.position) || 0,
    seoTitle: text("seoTitle", 70), seoDescription: text("seoDescription", 160), canonicalUrl: /^https?:\/\//i.test(text("canonicalUrl", 500)) ? text("canonicalUrl", 500) : "", seoImage: img,
  };
  void RESTORABLE;
  await db.transaction(async (tx) => {
    await tx.insert(revision).values({ entryId: cur.id, actor: who, note: "before restore", snapshot: snapOf(cur, links) });
    await tx.update(entry).set(restored).where(eq(entry.id, cur.id));
  });
  redirect(`/admin/entries/${cur.id}?restored=1`);
}
