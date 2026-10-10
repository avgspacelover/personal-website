import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb, education, entry, resume, resumeItem, skill } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { SECTIONS, TEMPLATES, buildResume } from "@/lib/resume";
import { renderResumePdf } from "@/lib/resume-pdf";
import { UUID } from "@/lib/slug";
import { deleteResume, saveResume } from "../actions";
const ta = { width: "100%" } as const;
export default async function Builder(props: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) { const params = await props.params; const searchParams = await props.searchParams;
  await requireAdmin();
  if (!UUID.test(params.id)) notFound();
  const db = await getDb();
  const [r] = await db.select().from(resume).where(eq(resume.id, params.id)).limit(1);
  if (!r) notFound();
  const [items, es, ss, ds, model] = await Promise.all([
    db.select().from(resumeItem).where(eq(resumeItem.resumeId, r.id)),
    db.select().from(entry).where(eq(entry.status, "published")).orderBy(asc(entry.kind), asc(entry.position)),
    db.select().from(skill).orderBy(asc(skill.position)), db.select().from(education).orderBy(asc(education.position)), buildResume(r.id),
  ]);
  const pdf = model ? await renderResumePdf(model) : null;
  const cur = (rid: string) => items.find((i) => i.entryId === rid || i.skillId === rid || i.educationId === rid);
  const groups = [
    { key: "experience", rows: es.filter((e) => e.kind === "experience").map((e) => ({ id: e.id, title: e.title + (e.organization ? `, ${e.organization}` : ""), meta: e.period, fallback: e.summary })) },
    { key: "projects", rows: es.filter((e) => e.kind === "projects").map((e) => ({ id: e.id, title: e.title, meta: e.period, fallback: e.summary })) },
    { key: "skills", rows: ss.map((s) => ({ id: s.id, title: s.category, meta: s.items.join(", "), fallback: "" })) },
    { key: "education", rows: ds.map((d) => ({ id: d.id, title: d.institution, meta: d.period, fallback: "" })) },
  ];
  return (<>
    <p className="mono" style={{ marginTop: "2rem" }}><Link href="/admin/resumes">RESUMES</Link> / {r.name.toUpperCase()}</p>
    <h1 style={{ marginTop: ".5rem" }}>{r.name}</h1>
    <form action={saveResume} className="login edit" style={{ maxWidth: "46rem" }}>
      <input type="hidden" name="id" value={r.id} />
      {searchParams.error && <p role="alert" className="err">{searchParams.error === "name" ? "Name is required." : "Tick the confirmation box to delete."}</p>}
      {searchParams.saved && <p role="status" className="err">Saved.</p>}
      <label className="mono" htmlFor="name">VERSION NAME</label><input id="name" name="name" defaultValue={r.name} required />
      <label className="mono" htmlFor="fullName">FULL NAME (HEADER)</label><input id="fullName" name="fullName" defaultValue={r.fullName} />
      <label className="mono" htmlFor="contact">CONTACT LINE (SEPARATE ITEMS WITH |)</label><input id="contact" name="contact" defaultValue={r.contact} />
      <label className="mono" htmlFor="headline">HEADLINE (2 SENTENCES MAX; YOU WRITE IT)</label><textarea id="headline" name="headline" rows={2} defaultValue={r.headline} />
      <label className="mono" htmlFor="template">TEMPLATE</label><select id="template" name="template" defaultValue={r.template}>{TEMPLATES.map((t) => <option key={t} value={t}>{t === "classic" ? "Classic (single column, serif)" : t}</option>)}</select>
      <label className="mono" htmlFor="pages">LENGTH</label><select id="pages" name="pages" defaultValue={r.pages}><option value="one">One page</option><option value="multi">Multi-page</option></select>
      <label className="mono" htmlFor="status">STATUS</label><select id="status" name="status" defaultValue={r.status}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select>
      <label><input type="checkbox" name="isPublic" defaultChecked={r.isPublic} style={{ minHeight: 0 }} /> Show this version on /resume (needs status Published)</label>
      <fieldset style={{ border: "1px solid var(--control)", borderRadius: 2, padding: ".75rem" }}><legend className="mono">SECTIONS (ORDER 1 = FIRST)</legend>
        {SECTIONS.map((k) => <div key={k} style={{ display: "flex", gap: "1rem", alignItems: "center", minHeight: 44 }}>
          <label style={{ flex: 1 }}><input type="checkbox" name={`sec_${k}`} defaultChecked={r.sections.includes(k)} style={{ minHeight: 0 }} /> {k}</label>
          <input type="number" name={`secpos_${k}`} defaultValue={r.sections.indexOf(k) < 0 ? 9 : r.sections.indexOf(k) + 1} aria-label={`${k} order`} style={{ width: "5rem" }} />
        </div>)}
      </fieldset>
      {groups.map((g) => <fieldset key={g.key} style={{ border: "1px solid var(--control)", borderRadius: 2, padding: ".75rem" }}><legend className="mono">{g.key.toUpperCase()}</legend>
        {!g.rows.length && <p className="mono" style={{ margin: 0 }}>No published records.</p>}
        {g.rows.map((x) => { const c = cur(x.id); return (
          <div key={x.id} style={{ borderTop: "1px solid var(--rule)", padding: ".6rem 0" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", minHeight: 44 }}>
              <label style={{ flex: 1 }}><input type="checkbox" name={`i_${x.id}`} defaultChecked={!!c} style={{ minHeight: 0 }} /> {x.title} <span className="mono">{x.meta}</span></label>
              <input type="number" name={`p_${x.id}`} defaultValue={c?.position ?? 0} aria-label={`Order of ${x.title}`} style={{ width: "5rem" }} />
            </div>
            {g.key !== "skills" && <><label className="mono" htmlFor={`b_${x.id}`}>BULLETS FOR THIS VERSION (ONE PER LINE{x.fallback ? "; BLANK = CANONICAL SUMMARY" : ""})</label>
              <textarea id={`b_${x.id}`} name={`b_${x.id}`} rows={2} style={ta} defaultValue={c?.bullets.join("\n")} placeholder={x.fallback} /></>}
          </div>); })}
      </fieldset>)}
      <button className="tbtn big">SAVE</button>
    </form>
    <section className="blk"><h2>Outline</h2><div>
      {model?.sections.length ? model.sections.map((s) => <div key={s.key}><p className="mono" style={{ margin: ".5rem 0 0" }}>{s.title.toUpperCase()}</p>
        <ol style={{ margin: 0 }}>{s.items.map((i, n) => <li key={n}>{i.title}{i.sub ? `, ${i.sub}` : ""}{i.period ? ` (${i.period})` : ""}{i.bullets.length > 0 && <ul>{i.bullets.map((b, k) => <li key={k}>{b}</li>)}</ul>}</li>)}</ol></div>) : <p className="mono">Nothing selected yet.</p>}
      {pdf && <p className="mono" role="status">PDF / {pdf.pages} PAGE{pdf.pages === 1 ? "" : "S"}{!pdf.fits ? " / DOES NOT FIT ONE PAGE: SHORTEN BULLETS OR DROP ITEMS" : ""} / <a href={`/api/admin/resumes/${r.id}/pdf`} target="_blank" rel="noreferrer">OPEN PDF</a></p>}</div></section>
    <section className="blk"><h2>Delete</h2><form action={deleteResume} className="login edit"><input type="hidden" name="id" value={r.id} />
      <label><input type="checkbox" name="confirm" style={{ minHeight: 0 }} /> I understand this cannot be undone</label><button className="tbtn big">DELETE VERSION</button></form></section>
  </>);
}
