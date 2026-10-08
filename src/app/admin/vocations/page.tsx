import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb, vocation } from "@/db";
import { requireAdmin } from "@/lib/auth";
export default async function Vocations() {
  await requireAdmin();
  const rows = await (await getDb()).select().from(vocation).orderBy(asc(vocation.position), asc(vocation.name));
  return (<>
    <h1>Vocations</h1>
    <p className="lede">Each vocation is a section of the site at <span className="mono">/slug</span>. Lower position sorts first.</p>
    <p><Link className="tbtn big" href="/admin/vocations/new" style={{ textDecoration: "none", display: "inline-block" }}>NEW VOCATION</Link></p>
    <section className="blk"><h2>All</h2><ul className="rows">
      {rows.map((v) => <li key={v.id}><span className="mono">{String(v.position).padStart(3, "0")}</span><Link href={`/admin/vocations/${v.id}`}>{v.name}</Link><span className="mono">{v.status.toUpperCase()}</span><p>/{v.slug}</p></li>)}
      {!rows.length && <li><span className="mono">EMPTY</span><span>No vocations yet.</span><span /></li>}
    </ul></section>
  </>);
}
