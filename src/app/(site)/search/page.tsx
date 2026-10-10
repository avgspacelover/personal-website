import Link from "next/link";
import { searchPublic } from "@/lib/queries";
export const metadata = { title: "Search", robots: { index: false, follow: true } };
export default async function Search(props: { searchParams: Promise<{ q?: string }> }) { const searchParams = await props.searchParams;
  const q = (searchParams.q ?? "").slice(0, 200).trim();
  const hits = await searchPublic(q);
  return (<>
    <h1>Search</h1>
    <form role="search" action="/search" className="login edit">
      <label className="sr" htmlFor="q">Search the archive</label>
      <input id="q" name="q" type="search" defaultValue={q} placeholder="projects, essays, tags..." />
      <button className="tbtn big">SEARCH</button>
    </form>
    {q && <section className="blk"><h2>{hits.length} RESULT{hits.length === 1 ? "" : "S"}</h2><ul className="rows">
      {hits.map((h) => <li key={h.type + h.href + h.title}><span className="mono">{h.type}</span><Link href={h.href}>{h.title}</Link><span />{h.note && <p>{h.note}</p>}</li>)}
      {!hits.length && <li><span className="mono">NONE</span><span>Nothing matches every word. Try fewer or shorter terms.</span><span /></li>}
    </ul></section>}
  </>);
}
