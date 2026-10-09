import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, agentRun, resume } from "@/db";
import type { LogEntry, Proposal } from "@/lib/agent/tools";
import { requireAdmin } from "@/lib/auth";
import { UUID } from "@/lib/slug";
import { applyRun, discardRun } from "../actions";
const msg: Record<string, string> = { none: "Tick at least one record to apply.", resume: "That resume no longer exists." };
export default async function Run({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  await requireAdmin();
  if (!UUID.test(params.id)) notFound();
  const db = await getDb();
  const [run] = await db.select().from(agentRun).where(eq(agentRun.id, params.id)).limit(1);
  if (!run) notFound();
  const p = run.proposal as Proposal, log = run.log as LogEntry[], open = run.status === "proposed";
  const resumes = open ? await db.select({ id: resume.id, name: resume.name }).from(resume) : [];
  return (<>
    <p className="mono" style={{ marginTop: "2rem" }}><Link href="/admin/agent">AGENT</Link> / {run.mode.toUpperCase()} / {run.status.toUpperCase()} / PROVIDER {run.provider.toUpperCase()}</p>
    <h1 style={{ marginTop: ".5rem" }}>{p.name || "Proposal"}</h1>
    <p className="lede">{run.summary}</p>
    {run.status === "applied" && run.resumeId && <p className="err">Applied as a draft. <Link href={`/admin/resumes/${run.resumeId}`}>Open the resume</Link>.</p>}
    {searchParams.error && <p role="alert" className="err">{msg[searchParams.error] ?? "Could not apply."}</p>}
    <form action={applyRun} className="login edit" style={{ maxWidth: "46rem" }}>
      <input type="hidden" name="id" value={run.id} />
      <section className="blk" style={{ display: "block" }}><h2>Proposed records</h2>
        {!p.picks.length && <p className="mono">NO RECORDS SELECTED</p>}
        {p.picks.map((x) => (
          <fieldset key={x.id} style={{ border: "1px solid var(--control)", borderRadius: 2, padding: ".75rem", marginTop: ".75rem" }}>
            <legend className="mono">{x.kind === "projects" ? "PROJECT" : "EXPERIENCE"} / RELEVANCE {x.score}</legend>
            <label><input type="checkbox" name={`pick_${x.id}`} defaultChecked disabled={!open} style={{ minHeight: 0 }} /> <strong>{x.title}</strong></label>
            <p className="mono" style={{ margin: ".25rem 0" }}>MATCHED: {x.reasons.join(", ") || "none"} / SOURCE: <Link href={`/admin/entries/${x.id}`}>EDIT RECORD</Link>{x.path ? <> / <Link href={x.path}>PUBLIC PAGE</Link></> : null}</p>
            <label className="mono" htmlFor={`b_${x.id}`}>BULLETS (EDITABLE; ONE PER LINE)</label>
            <textarea id={`b_${x.id}`} name={`b_${x.id}`} rows={3} defaultValue={x.bullets.map((b) => b.text).join("\n")} disabled={!open} style={{ width: "100%" }} />
            {x.bullets.map((b, i) => <p key={i} className="mono" style={{ margin: ".25rem 0" }}>EVIDENCE {i + 1}: “{b.evidence}”</p>)}
          </fieldset>))}
      </section>
      {open && <>
        <label className="mono" htmlFor="target">APPLY TO</label>
        <select id="target" name="target"><option value="new">New draft resume</option>{resumes.map((r) => <option key={r.id} value={r.id}>Add to: {r.name}</option>)}</select>
        <label className="mono" htmlFor="name">NAME (NEW DRAFT)</label><input id="name" name="name" defaultValue={p.name} />
        <p className="mono" style={{ margin: 0 }}>APPLYING CREATES OR EXTENDS A DRAFT. IT NEVER PUBLISHES, NEVER EDITS RECORDS, AND NEVER CHANGES ITEMS ALREADY ON A RESUME.</p>
        <button className="tbtn big">APPLY AS DRAFT</button></>}
    </form>
    {open && <form action={discardRun}><input type="hidden" name="id" value={run.id} /><button className="tbtn">DISCARD PROPOSAL</button></form>}
    {p.gaps.length > 0 && <section className="blk"><h2>Gaps</h2><ul style={{ margin: 0 }}>{p.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul></section>}
    {p.rejected.length > 0 && <section className="blk"><h2>Rejected bullets</h2><ul style={{ margin: 0 }}>{p.rejected.map((r, i) => <li key={i}>{r.title}: “{r.text}” <span className="mono">/ {r.reason}</span></li>)}</ul></section>}
    <section className="blk"><h2>Audit log</h2><details><summary className="mono">{log.length} TOOL CALLS</summary><ol>{log.map((l, i) => <li key={i} className="mono" style={{ wordBreak: "break-all" }}>{l.tool} {JSON.stringify(l.args).slice(0, 200)} → {l.result.slice(0, 160)}</li>)}</ol></details></section>
    <section className="blk"><h2>Target</h2><p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{run.target}</p></section>
  </>);
}
