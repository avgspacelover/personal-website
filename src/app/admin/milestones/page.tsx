import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb, accomplishment, accomplishmentVocation, stat, vocation } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
const btn = { textDecoration: "none", display: "inline-block", marginRight: ".75rem" } as const;
export const metadata = { title: "Milestones" };
export default async function AdminMilestones() {
  await requireAdmin();
  const db = await getDb(), s = await getSettings();
  const [acc, links, stats] = await Promise.all([
    db.select().from(accomplishment).orderBy(asc(accomplishment.position), asc(accomplishment.title)),
    db.select({ aid: accomplishmentVocation.accomplishmentId, name: vocation.name }).from(accomplishmentVocation).innerJoin(vocation, eq(vocation.id, accomplishmentVocation.vocationId)).orderBy(asc(accomplishmentVocation.position)),
    db.select().from(stat).orderBy(asc(stat.position), asc(stat.label)),
  ]);
  return (<>
    <h1>{s.milestonesTitle}</h1>
    <p className="lede">Accomplishments and numbers shown on the public <Link href="/milestones">/milestones</Link> page. Rename the tab in <Link href="/admin/settings">Site settings</Link>. The reading and watching counts are automatic: they come from the &ldquo;year read / watched&rdquo; field on library items.</p>
    <p><Link className="tbtn big" style={btn} href="/admin/milestones/accomplishments/new">NEW ACCOMPLISHMENT</Link><Link className="tbtn big" style={btn} href="/admin/milestones/stats/new">NEW NUMBER</Link></p>
    <section className="blk"><h2>Accomplishments</h2><ul className="rows">
      {acc.map((a) => { const vn = links.filter((l) => l.aid === a.id).map((l) => l.name).join(" / "); return <li key={a.id}><span className="mono">{a.year || "n/a"}</span><Link href={`/admin/milestones/accomplishments/${a.id}`}>{a.title}{a.figure ? ` / ${a.figure}` : ""}</Link><span className="mono">{a.status.toUpperCase()}</span><p>{vn || "No vocation"}</p></li>; })}
      {!acc.length && <li><span className="mono">EMPTY</span><span>No accomplishments yet.</span><span /></li>}
    </ul></section>
    <section className="blk"><h2>Numbers</h2><ul className="rows">
      {stats.map((r) => <li key={r.id}><span className="mono">{r.period || "n/a"}</span><Link href={`/admin/milestones/stats/${r.id}`}>{r.label}: {r.value}</Link><span className="mono">{r.status.toUpperCase()}</span></li>)}
      {!stats.length && <li><span className="mono">EMPTY</span><span>No numbers yet.</span><span /></li>}
    </ul></section>
  </>);
}
