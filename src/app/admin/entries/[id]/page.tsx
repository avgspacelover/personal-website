import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { getDb, entry, mediaAsset, revision, vocation, vocationEntry } from "@/db";
import { changedFields, snapOf } from "@/lib/revisions";
import { RichEditor } from "@/components/RichEditor";
import { toDoc } from "@/lib/richtext";
import { mediaUrl, variantKeys } from "@/lib/storage";
import { requireAdmin } from "@/lib/auth";
import { UUID } from "@/lib/slug";
import { deleteEntry, restoreRevision, saveEntry } from "../actions";
const msg: Record<string, string> = { title: "Title is required.", slug: "Slug could not be derived; enter one.", taken: "Another record of this type already uses that slug.", canonical: "Canonical URL must start with https:// or http://.", seoimage: "Choose a social image from the media library.", confirm: "Tick the confirmation box to delete.", body: "Body could not be read; reload and try again." };
type P = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; kind?: string; restored?: string }> };
export default async function EditEntry(props: P) { const params = await props.params; const searchParams = await props.searchParams;
  await requireAdmin();
  const db = await getDb();
  const isNew = params.id === "new";
  const e = isNew || !UUID.test(params.id) ? null : (await db.select().from(entry).where(eq(entry.id, params.id)).limit(1))[0];
  if (!isNew && !e) notFound();
  const [vocs, links, assets] = await Promise.all([
    db.select().from(vocation).orderBy(asc(vocation.position), asc(vocation.name)),
    e ? db.select().from(vocationEntry).where(eq(vocationEntry.entryId, e.id)) : Promise.resolve([]),
    db.select().from(mediaAsset).orderBy(desc(mediaAsset.createdAt)).limit(60),
  ]);
  const media = assets.map((a) => ({ url: mediaUrl(a.key), thumb: mediaUrl(a.variants.includes(480) ? variantKeys(a.key, [480])[0] : a.key), alt: a.alt }));
  const revs = e ? await db.select().from(revision).where(eq(revision.entryId, e.id)).orderBy(desc(revision.at)) : [];
  const curSnap = e ? snapOf(e, links) : null;
  const kind = e?.kind ?? (searchParams.kind === "experience" ? "experience" : "projects");
  return (<>
    <p className="mono" style={{ marginTop: "2rem" }}><Link href="/admin/entries">RECORDS</Link> / {kind.toUpperCase()} / {isNew ? "NEW" : e!.slug.toUpperCase()}</p>
    <h1 style={{ marginTop: ".5rem" }}>{isNew ? `New ${kind === "projects" ? "project" : "experience"}` : e!.title}</h1>
    {e && <p className="mono"><Link href={`/preview/${e.id}`} target="_blank">PREVIEW IN THE PUBLIC LAYOUT (LAST SAVED VERSION)</Link></p>}
    {searchParams.restored && <p role="status" className="err">Restored. The previous content was kept in History.</p>}
    <form action={saveEntry} className="login edit">
      <input type="hidden" name="id" value={e?.id ?? ""} /><input type="hidden" name="kind" value={kind} />
      {searchParams.error && <p role="alert" className="err">{msg[searchParams.error] ?? "Could not save."}</p>}
      <label className="mono" htmlFor="title">{kind === "projects" ? "TITLE" : "ROLE TITLE"}</label><input id="title" name="title" defaultValue={e?.title} required />
      <label className="mono" htmlFor="slug">SLUG (BLANK = FROM TITLE)</label><input id="slug" name="slug" defaultValue={e?.slug} />
      <label className="mono" htmlFor="organization">ORGANIZATION</label><input id="organization" name="organization" defaultValue={e?.organization ?? ""} />
      <label className="mono" htmlFor="location">LOCATION</label><input id="location" name="location" defaultValue={e?.location} />
      <label className="mono" htmlFor="summary">SUMMARY</label><textarea id="summary" name="summary" rows={2} defaultValue={e?.summary} />
      <label className="mono" htmlFor="period">PERIOD (E.G. 2023–2025)</label><input id="period" name="period" defaultValue={e?.period} />
      <label className="mono" htmlFor="phase">PHASE (E.G. ACTIVE)</label><input id="phase" name="phase" defaultValue={e?.phase} />
      <label className="mono" htmlFor="tech">TECHNOLOGY (COMMA-SEPARATED)</label><input id="tech" name="tech" defaultValue={e?.tech.join(", ")} />
      <span className="mono">BODY</span><RichEditor name="body" initial={toDoc(e?.body ?? [])} media={media} />
      <fieldset style={{ border: "1px solid var(--control)", borderRadius: 2, padding: ".75rem" }}>
        <legend className="mono">VOCATIONS</legend>
        {vocs.map((v) => { const l = links.find((x) => x.vocationId === v.id); return (
          <div key={v.id} style={{ display: "flex", gap: "1rem", alignItems: "center", minHeight: 44 }}>
            <label style={{ flex: 1 }}><input type="checkbox" name="vocations" value={v.id} defaultChecked={!!l} style={{ minHeight: 0 }} /> {v.name} <span className="mono">{v.status.toUpperCase()}</span></label>
            <label className="mono"><input type="radio" name="primary" value={v.id} defaultChecked={!!l?.isPrimary} style={{ minHeight: 0 }} /> PRIMARY</label>
          </div>); })}
        <p className="mono" style={{ margin: ".5rem 0 0" }}>Primary decides the canonical URL. With none ticked the record stays hidden publicly.</p>
      </fieldset>
      <fieldset style={{ border: "1px solid var(--control)", borderRadius: 2, padding: ".75rem" }}><legend className="mono">SEO (OPTIONAL; BLANK = AUTOMATIC)</legend>
        <label className="mono" htmlFor="seoTitle">SEARCH/SHARE TITLE (70 MAX)</label><input id="seoTitle" name="seoTitle" maxLength={70} defaultValue={e?.seoTitle} style={{ width: "100%" }} />
        <label className="mono" htmlFor="seoDescription">DESCRIPTION (160 MAX; DEFAULT = SUMMARY)</label><textarea id="seoDescription" name="seoDescription" rows={2} maxLength={160} defaultValue={e?.seoDescription} style={{ width: "100%" }} />
        <label className="mono" htmlFor="seoImage">SOCIAL IMAGE (DEFAULT = FIRST IMAGE IN THE BODY)</label>
        <select id="seoImage" name="seoImage" defaultValue={e?.seoImage ?? ""}><option value="">Automatic</option>{assets.map((a) => <option key={a.key} value={a.key}>{a.name || a.key}</option>)}</select>
        <label className="mono" htmlFor="canonicalUrl">CANONICAL URL OVERRIDE (ONLY IF PUBLISHED ELSEWHERE FIRST)</label><input id="canonicalUrl" name="canonicalUrl" type="url" maxLength={500} defaultValue={e?.canonicalUrl} style={{ width: "100%" }} />
        <p className="mono" style={{ margin: ".4rem 0 0" }}>An override points search engines at the other copy and removes this page from the sitemap.</p>
      </fieldset>
      <label className="mono" htmlFor="position">POSITION (LOWER FIRST)</label><input id="position" name="position" type="number" defaultValue={e?.position ?? 0} />
      <label><input type="checkbox" name="featured" defaultChecked={e?.featured} style={{ minHeight: 0 }} /> Featured on the homepage</label>
      <label className="mono" htmlFor="status">STATUS</label>
      <select id="status" name="status" defaultValue={e?.status ?? "draft"}><option value="draft">Draft (private)</option><option value="published">Published</option><option value="archived">Archived (private)</option></select>
      <button className="tbtn big">SAVE</button>
    </form>
    {e && <section className="blk"><h2>History</h2><div>
      {revs.length ? <ul className="rows">{revs.map((r) => { const ch = curSnap ? changedFields(r.snapshot as Record<string, unknown>, curSnap) : []; return (
        <li key={r.id}><span className="mono">{r.at.toISOString().replace("T", " ").slice(0, 16)}</span>
          <span>{r.note || "Earlier version"} <span className="mono">/ {r.actor} / differs from current: {ch.join(", ") || "nothing"}</span></span>
          <form action={restoreRevision}><input type="hidden" name="revisionId" value={r.id} /><button className="tbtn">RESTORE CONTENT</button></form></li>); })}</ul> : <p className="mono">NO EARLIER VERSIONS YET. A version is kept automatically each time a save changes something.</p>}
      <p className="mono">Restoring brings back content (title, summary, body, tags, SEO), not the slug, publish status or vocations. The current content is saved first, so a restore can be undone. Newest 30 are kept.</p></div></section>}
    {e && <section className="blk"><h2>Delete</h2>
      <form action={deleteEntry} className="login edit">
        <input type="hidden" name="id" value={e.id} />
        <label><input type="checkbox" name="confirm" style={{ minHeight: 0 }} /> I understand this cannot be undone</label>
        <button className="tbtn big">DELETE RECORD</button>
      </form></section>}
  </>);
}
