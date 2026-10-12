import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb, accomplishment, accomplishmentVocation, stat, vocation } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { UUID } from "@/lib/slug";
import { deleteMilestone, saveAccomplishment, saveStat } from "../../actions";
const msg: Record<string, string> = { title: "Title is required.", required: "Label and value are required.", url: "Link must start with https:// or http://.", confirm: "Tick the confirmation box to delete." };
export default async function EditMilestone(props: { params: Promise<{ kind: string; id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { kind, id } = await props.params; const sp = await props.searchParams;
  await requireAdmin();
  if (kind !== "accomplishments" && kind !== "stats") notFound();
  const db = await getDb(), isNew = id === "new", acc = kind === "accomplishments";
  const row = isNew || !UUID.test(id) ? null : acc ? (await db.select().from(accomplishment).where(eq(accomplishment.id, id)).limit(1))[0] : (await db.select().from(stat).where(eq(stat.id, id)).limit(1))[0];
  if (!isNew && !row) notFound();
  const a = acc ? (row as typeof accomplishment.$inferSelect | null) : null, s = !acc ? (row as typeof stat.$inferSelect | null) : null;
  const vocs = acc ? await db.select({ id: vocation.id, name: vocation.name }).from(vocation).orderBy(asc(vocation.position)) : [];
  const linked = new Set(acc && a ? (await db.select({ v: accomplishmentVocation.vocationId }).from(accomplishmentVocation).where(eq(accomplishmentVocation.accomplishmentId, a.id))).map((r) => r.v) : []);
  const status = (row as { status?: string } | null)?.status ?? "draft", position = (row as { position?: number } | null)?.position ?? 0;
  const F = (i: string, label: string, el: React.ReactNode) => <><label className="mono" htmlFor={i}>{label}</label>{el}</>;
  return (<>
    <p className="mono" style={{ marginTop: "2rem" }}><Link href="/admin/milestones">MILESTONES</Link> / {acc ? "ACCOMPLISHMENT" : "NUMBER"} / {isNew ? "NEW" : "EDIT"}</p>
    <h1 style={{ marginTop: ".5rem" }}>{isNew ? (acc ? "New accomplishment" : "New number") : (a?.title ?? `${s?.label}: ${s?.value}`)}</h1>
    <form action={acc ? saveAccomplishment : saveStat} className="login edit">
      <input type="hidden" name="id" value={row ? (row as { id: string }).id : ""} />
      {sp.error && <p role="alert" className="err">{msg[sp.error] ?? "Could not save."}</p>}
      {acc ? <>
        {F("title", "TITLE", <input id="title" name="title" maxLength={200} defaultValue={a?.title} required />)}
        {F("figure", "HEADLINE FIGURE (OPTIONAL, E.G. 40%, 1ST PLACE, 12K USERS)", <input id="figure" name="figure" maxLength={40} defaultValue={a?.figure} />)}
        {F("detail", "DETAIL", <textarea id="detail" name="detail" rows={3} maxLength={600} defaultValue={a?.detail} />)}
        {F("year", "YEAR", <input id="year" name="year" maxLength={20} placeholder="2026" defaultValue={a?.year} />)}
        <fieldset style={{ border: "1px solid var(--control)", borderRadius: 2, padding: ".75rem" }}><legend className="mono">VOCATIONS (ANY NUMBER; ALSO SHOWN ON EACH VOCATION'S PAGE)</legend>
          {vocs.map((v) => <label key={v.id} style={{ display: "flex", gap: ".6rem", alignItems: "center", minHeight: 44 }}><input type="checkbox" name="vocations" value={v.id} defaultChecked={linked.has(v.id)} style={{ minHeight: 0 }} /> {v.name}</label>)}
          {!vocs.length && <p className="mono" style={{ margin: 0 }}>NO VOCATIONS YET</p>}
        </fieldset>
        {F("url", "LINK (OPTIONAL)", <input id="url" name="url" type="url" maxLength={500} defaultValue={a?.url ?? ""} />)}
      </> : <>
        {F("label", "LABEL (E.G. TALKS GIVEN)", <input id="label" name="label" maxLength={80} defaultValue={s?.label} required />)}
        {F("value", "VALUE (E.G. 12, 3.4K, 2 / 3)", <input id="value" name="value" maxLength={40} defaultValue={s?.value} required />)}
        {F("period", "PERIOD (E.G. 2026, ALL TIME)", <input id="period" name="period" maxLength={30} defaultValue={s?.period} />)}
        {F("note", "NOTE (OPTIONAL)", <input id="note" name="note" maxLength={200} defaultValue={s?.note} />)}
        {F("url", "LINK (OPTIONAL)", <input id="url" name="url" type="url" maxLength={500} defaultValue={s?.url ?? ""} />)}
      </>}
      {F("position", "POSITION (LOWER FIRST)", <input id="position" name="position" type="number" defaultValue={position} />)}
      {F("status", "STATUS", <select id="status" name="status" defaultValue={status}><option value="draft">Draft (private)</option><option value="published">Published</option><option value="archived">Archived (private)</option></select>)}
      <button className="tbtn big">SAVE</button>
    </form>
    {row && <section className="blk"><h2>Delete</h2><form action={deleteMilestone} className="login edit"><input type="hidden" name="id" value={(row as { id: string }).id} /><input type="hidden" name="kind" value={kind} />
      <label><input type="checkbox" name="confirm" style={{ minHeight: 0 }} /> I understand this cannot be undone</label><button className="tbtn big">DELETE</button></form></section>}
  </>);
}
