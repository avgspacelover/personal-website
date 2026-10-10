import { desc } from "drizzle-orm";
import { getDb, auditLog } from "@/db";
import { requireAdmin } from "@/lib/auth";
export const metadata = { title: "Audit log" };
export default async function Audit() {
  await requireAdmin();
  const rows = await (await getDb()).select().from(auditLog).orderBy(desc(auditLog.at)).limit(200);
  return (<>
    <h1>Audit log</h1>
    <p className="lede">Sign-ins (allowed and denied) and every change made in the admin. Newest first, last 200.</p>
    <section className="blk"><h2>Events</h2><ul className="rows">
      {rows.map((r) => <li key={r.id}><span className="mono">{r.at.toISOString().replace("T", " ").slice(0, 16)}</span><span>{r.action}{r.detail ? ` ${r.detail}` : ""}</span><span className="mono">{r.actor}</span></li>)}
      {!rows.length && <li><span className="mono">EMPTY</span><span>Nothing recorded yet.</span><span /></li>}
    </ul></section>
  </>);
}
