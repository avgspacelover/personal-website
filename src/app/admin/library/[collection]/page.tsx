import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb, libraryItem } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { COLLECTIONS } from "@/lib/library";
export default async function List(props: { params: Promise<{ collection: string }> }) { const params = await props.params;
  await requireAdmin();
  const cfg = COLLECTIONS[params.collection];
  if (!cfg) notFound();
  const rows = await (await getDb()).select().from(libraryItem).where(eq(libraryItem.collection, params.collection)).orderBy(asc(libraryItem.position), asc(libraryItem.title));
  return (<>
    <h1>{cfg.name}</h1>
    <nav aria-label="Collections" className="mono" style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
      {Object.entries(COLLECTIONS).map(([k, c]) => <Link key={k} href={`/admin/library/${k}`} aria-current={k === params.collection ? "page" : undefined} style={{ fontWeight: k === params.collection ? 700 : 400 }}>{c.name.toUpperCase()}</Link>)}
    </nav>
    <p><Link className="tbtn big" href={`/admin/library/${params.collection}/new`} style={{ textDecoration: "none", display: "inline-block" }}>NEW {cfg.one.toUpperCase()}</Link></p>
    <section className="blk"><h2>All</h2><ul className="rows">
      {rows.map((r) => <li key={r.id}><span className="mono">{String(r.position).padStart(3, "0")}</span><Link href={`/admin/library/${params.collection}/${r.id}`}>{r.title}</Link><span className="mono">{r.status.toUpperCase()}</span>{r.creator && <p>{r.creator}</p>}</li>)}
      {!rows.length && <li><span className="mono">EMPTY</span><span>Nothing here yet.</span><span /></li>}
    </ul></section>
  </>);
}
