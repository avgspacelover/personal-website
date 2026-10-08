import { requireAdmin } from "@/lib/auth";
import { getCounts } from "@/lib/admin-queries";
export default async function Dashboard() {
  await requireAdmin();
  const { e, v, l } = await getCounts();
  const sum = <T extends { n: number }>(rows: T[], f: (r: T) => boolean) => rows.filter(f).reduce((a, r) => a + r.n, 0);
  const rows = [
    ["Vocations", sum(v, (r) => r.status === "published"), sum(v, (r) => r.status !== "published")],
    ["Projects", sum(e, (r) => r.kind === "projects" && r.status === "published"), sum(e, (r) => r.kind === "projects" && r.status !== "published")],
    ["Experience", sum(e, (r) => r.kind === "experience" && r.status === "published"), sum(e, (r) => r.kind === "experience" && r.status !== "published")],
    ["Library items", sum(l, (r) => r.status === "published"), sum(l, (r) => r.status !== "published")],
  ];
  return (<>
    <h1>Dashboard</h1>
    <p className="lede">Content editing arrives in the next increments. This screen confirms the session is valid.</p>
    <section className="blk"><h2>Content</h2><ul className="rows">
      {rows.map(([name, pub, other]) => <li key={name as string}><span className="mono">COUNT</span><span>{name}</span><span className="mono">{pub} PUBLISHED / {other} OTHER</span></li>)}
    </ul></section>
  </>);
}
