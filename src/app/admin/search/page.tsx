import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { searchAdmin } from "@/lib/admin-queries";
export const metadata = { title: "Admin search" };
export default async function AdminSearch(props: { searchParams: Promise<{ q?: string }> }) { const searchParams = await props.searchParams;
  await requireAdmin();
  const q = (searchParams.q ?? "").slice(0, 200).trim();
  const hits = await searchAdmin(q);
  return (<>
    <h1>Search</h1>
    <form role="search" action="/admin/search" className="login edit">
      <label className="sr" htmlFor="q">Search all content including drafts</label>
      <input id="q" name="q" type="search" defaultValue={q} autoFocus /><button className="tbtn big">SEARCH</button>
    </form>
    {q && <section className="blk"><h2>{hits.length} RESULT{hits.length === 1 ? "" : "S"}</h2><ul className="rows">
      {hits.map((h) => <li key={h.href + h.title}><span className="mono">{h.type}</span><Link href={h.href}>{h.title}</Link><span className="mono">{h.status.toUpperCase()}</span></li>)}
    </ul></section>}
  </>);
}
