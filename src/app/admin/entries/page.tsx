import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb, entry, vocation, vocationEntry } from "@/db";
import { requireAdmin } from "@/lib/auth";
const btn = { textDecoration: "none", display: "inline-block", marginRight: ".75rem" };
export default async function Entries() {
  await requireAdmin();
  const db = await getDb();
  const [rows, links] = await Promise.all([
    db.select().from(entry).orderBy(asc(entry.kind), asc(entry.position), asc(entry.title)),
    db.select({ entryId: vocationEntry.entryId, name: vocation.name }).from(vocationEntry).innerJoin(vocation, eq(vocation.id, vocationEntry.vocationId)).orderBy(asc(vocationEntry.position)),
  ]);
  return (<>
    <h1>Projects and experience</h1>
    <p className="lede">One record each. Link it to any number of vocations; the first-ticked primary one decides its URL.</p>
    <p><Link className="tbtn big" style={btn} href="/admin/entries/new?kind=projects">NEW PROJECT</Link><Link className="tbtn big" style={btn} href="/admin/entries/new?kind=experience">NEW EXPERIENCE</Link></p>
    <section className="blk"><h2>All</h2><ul className="rows">
      {rows.map((e) => {
        const names = links.filter((l) => l.entryId === e.id).map((l) => l.name);
        return <li key={e.id}><span className="mono">{e.kind === "projects" ? "PROJECT" : "EXPERIENCE"}</span><Link href={`/admin/entries/${e.id}`}>{e.title}{e.organization ? `, ${e.organization}` : ""}</Link><span className="mono">{e.status.toUpperCase()}{e.featured ? " / FEATURED" : ""}</span><p>{names.length ? names.join(" / ") : "No vocation: hidden from the public site"}</p></li>;
      })}
      {!rows.length && <li><span className="mono">EMPTY</span><span>No records yet.</span><span /></li>}
    </ul></section>
  </>);
}
