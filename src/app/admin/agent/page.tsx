import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb, agentRun, resume } from "@/db";
import { providerInfo } from "@/lib/agent";
import { requireAdmin } from "@/lib/auth";
import { startRun } from "./actions";
export const metadata = { title: "Resume agent" };
const msg: Record<string, string> = { mode: "Choose a mode.", target: "Describe the role or paste the job description.", resume: "Choose a resume to improve.", nobullets: "That resume has no version-specific bullets to improve yet." };
export default async function Agent(props: { searchParams: Promise<{ error?: string }> }) { const searchParams = await props.searchParams;
  await requireAdmin();
  const db = await getDb(), prov = providerInfo();
  const [runs, resumes] = await Promise.all([db.select().from(agentRun).orderBy(desc(agentRun.createdAt)).limit(15), db.select({ id: resume.id, name: resume.name }).from(resume)]);
  return (<>
    <h1>Resume agent</h1>
    <p className="lede">Proposes which records to include and grounded bullet wording for a role. It reads published records only, edits nothing, and nothing is applied until you approve it.</p>
    <p className="mono" role="note">PROVIDER / {prov.name === "anthropic" ? `LANGUAGE MODEL (${prov.model}). RECORD TEXT AND YOUR TARGET ARE SENT TO THE MODEL PROVIDER.` : "OFFLINE RANKING. NO MODEL, NO DATA LEAVES THIS SERVER. SET ANTHROPIC_API_KEY FOR WORDING HELP."}</p>
    <form action={startRun} className="login edit">
      {searchParams.error && <p role="alert" className="err">{msg[searchParams.error] ?? "Could not start."}</p>}
      <label className="mono" htmlFor="mode">MODE</label>
      <select id="mode" name="mode"><option value="tailor">Tailor to a job description</option><option value="create">Create a resume for a role</option><option value="rank">Rank projects for a role</option><option value="gap">Gap analysis</option><option value="improve">Improve an existing resume's bullets (needs a model)</option></select>
      <label className="mono" htmlFor="target">ROLE OR JOB DESCRIPTION</label><textarea id="target" name="target" rows={8} />
      <label className="mono" htmlFor="resumeId">RESUME (ONLY FOR "IMPROVE")</label>
      <select id="resumeId" name="resumeId"><option value="">None</option>{resumes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      <button className="tbtn big">RUN AGENT</button>
    </form>
    <section className="blk"><h2>Recent runs</h2><ul className="rows">
      {runs.map((r) => <li key={r.id}><span className="mono">{r.mode.toUpperCase()}</span><Link href={`/admin/agent/${r.id}`}>{r.target.split("\n")[0].slice(0, 70) || r.mode}</Link><span className="mono">{r.status.toUpperCase()}</span></li>)}
      {!runs.length && <li><span className="mono">EMPTY</span><span>No runs yet.</span><span /></li>}
    </ul></section>
  </>);
}
