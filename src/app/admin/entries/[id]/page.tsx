import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb, entry, vocation, vocationEntry } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { UUID } from "@/lib/slug";
import { deleteEntry, saveEntry } from "../actions";
const msg: Record<string, string> = { title: "Title is required.", slug: "Slug could not be derived; enter one.", taken: "Another record of this type already uses that slug.", confirm: "Tick the confirmation box to delete." };
type P = { params: { id: string }; searchParams: { error?: string; kind?: string } };
export default async function EditEntry({ params, searchParams }: P) {
  await requireAdmin();
  const db = await getDb();
  const isNew = params.id === "new";
  const e = isNew || !UUID.test(params.id) ? null : (await db.select().from(entry).where(eq(entry.id, params.id)).limit(1))[0];
  if (!isNew && !e) notFound();
  const [vocs, links] = await Promise.all([
    db.select().from(vocation).orderBy(asc(vocation.position), asc(vocation.name)),
    e ? db.select().from(vocationEntry).where(eq(vocationEntry.entryId, e.id)) : Promise.resolve([]),
  ]);
  const kind = e?.kind ?? (searchParams.kind === "experience" ? "experience" : "projects");
  const body = Array.isArray(e?.body) ? (e!.body as string[]).join("\n\n") : "";
  return (<>
    <p className="mono" style={{ marginTop: "2rem" }}><Link href="/admin/entries">RECORDS</Link> / {kind.toUpperCase()} / {isNew ? "NEW" : e!.slug.toUpperCase()}</p>
    <h1 style={{ marginTop: ".5rem" }}>{isNew ? `New ${kind === "projects" ? "project" : "experience"}` : e!.title}</h1>
    <form action={saveEntry} className="login edit">
      <input type="hidden" name="id" value={e?.id ?? ""} /><input type="hidden" name="kind" value={kind} />
      {searchParams.error && <p role="alert" className="err">{msg[searchParams.error] ?? "Could not save."}</p>}
      <label className="mono" htmlFor="title">{kind === "projects" ? "TITLE" : "ROLE TITLE"}</label><input id="title" name="title" defaultValue={e?.title} required />
      <label className="mono" htmlFor="slug">SLUG (BLANK = FROM TITLE)</label><input id="slug" name="slug" defaultValue={e?.slug} />
      <label className="mono" htmlFor="organization">ORGANIZATION</label><input id="organization" name="organization" defaultValue={e?.organization ?? ""} />
      <label className="mono" htmlFor="summary">SUMMARY</label><textarea id="summary" name="summary" rows={2} defaultValue={e?.summary} />
      <label className="mono" htmlFor="period">PERIOD (E.G. 2023–2025)</label><input id="period" name="period" defaultValue={e?.period} />
      <label className="mono" htmlFor="phase">PHASE (E.G. ACTIVE)</label><input id="phase" name="phase" defaultValue={e?.phase} />
      <label className="mono" htmlFor="tech">TECHNOLOGY (COMMA-SEPARATED)</label><input id="tech" name="tech" defaultValue={e?.tech.join(", ")} />
      <label className="mono" htmlFor="body">BODY (BLANK LINE BETWEEN PARAGRAPHS; RICH EDITOR LATER)</label><textarea id="body" name="body" rows={10} defaultValue={body} />
      <fieldset style={{ border: "1px solid var(--rule)", borderRadius: 2, padding: ".75rem" }}>
        <legend className="mono">VOCATIONS</legend>
        {vocs.map((v) => { const l = links.find((x) => x.vocationId === v.id); return (
          <div key={v.id} style={{ display: "flex", gap: "1rem", alignItems: "center", minHeight: 44 }}>
            <label style={{ flex: 1 }}><input type="checkbox" name="vocations" value={v.id} defaultChecked={!!l} style={{ minHeight: 0 }} /> {v.name} <span className="mono">{v.status.toUpperCase()}</span></label>
            <label className="mono"><input type="radio" name="primary" value={v.id} defaultChecked={!!l?.isPrimary} style={{ minHeight: 0 }} /> PRIMARY</label>
          </div>); })}
        <p className="mono" style={{ margin: ".5rem 0 0" }}>Primary decides the canonical URL. With none ticked the record stays hidden publicly.</p>
      </fieldset>
      <label className="mono" htmlFor="position">POSITION (LOWER FIRST)</label><input id="position" name="position" type="number" defaultValue={e?.position ?? 0} />
      <label><input type="checkbox" name="featured" defaultChecked={e?.featured} style={{ minHeight: 0 }} /> Featured on the homepage</label>
      <label className="mono" htmlFor="status">STATUS</label>
      <select id="status" name="status" defaultValue={e?.status ?? "draft"}><option value="draft">Draft (private)</option><option value="published">Published</option><option value="archived">Archived (private)</option></select>
      <button className="tbtn big">SAVE</button>
    </form>
    {e && <section className="blk"><h2>Delete</h2>
      <form action={deleteEntry} className="login edit">
        <input type="hidden" name="id" value={e.id} />
        <label><input type="checkbox" name="confirm" style={{ minHeight: 0 }} /> I understand this cannot be undone</label>
        <button className="tbtn big">DELETE RECORD</button>
      </form></section>}
  </>);
}
