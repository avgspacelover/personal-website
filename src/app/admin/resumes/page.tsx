import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb, resume } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { TEMPLATES } from "@/lib/resume";
import { createResume } from "./actions";
export default async function Resumes({ searchParams }: { searchParams: { error?: string } }) {
  await requireAdmin();
  const rows = await (await getDb()).select().from(resume).orderBy(desc(resume.updatedAt));
  return (<>
    <h1>Resumes</h1>
    <p className="lede">Named versions (e.g. Software Engineer, Machine Learning). Each one selects and orders canonical records; it never copies them.</p>
    <form action={createResume} className="login edit">
      {searchParams.error && <p role="alert" className="err">Name is required.</p>}
      <label className="mono" htmlFor="name">NEW VERSION NAME</label><input id="name" name="name" required />
      <label className="mono" htmlFor="template">TEMPLATE</label><select id="template" name="template">{TEMPLATES.map((t) => <option key={t}>{t}</option>)}</select>
      <button className="tbtn big">CREATE</button>
    </form>
    <section className="blk"><h2>Versions</h2><ul className="rows">
      {rows.map((r) => <li key={r.id}><span className="mono">{r.template.toUpperCase()}</span><Link href={`/admin/resumes/${r.id}`}>{r.name}</Link><span className="mono">{r.status.toUpperCase()}</span></li>)}
      {!rows.length && <li><span className="mono">EMPTY</span><span>No resume versions yet.</span><span /></li>}
    </ul></section>
  </>);
}
