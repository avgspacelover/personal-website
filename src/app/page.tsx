import Link from "next/link";
import { vocations, entries, entryHref, collections, inVocation } from "@/lib/content";
export default function Home() {
  return (<>
    <h1>Software, systems, and ideas, filed by discipline.</h1>
    <p className="lede">Professional work is organized by vocation. Essays, books, films, and communities live separately in the library.</p>
    <section className="blk"><h2>Vocations</h2><ul className="rows">
      {vocations.map((v, i) => <li key={v.slug}><span className="mono">V / {String(i + 1).padStart(3, "0")}</span><Link href={`/${v.slug}`}>{v.name}</Link><span className="mono">{inVocation(v.slug).length} RECORDS</span><p>{v.intro}</p></li>)}
    </ul></section>
    <section className="blk"><h2>Currently</h2><p className="prose">Placeholder: edit this snapshot of what you are building, learning, and reading.</p></section>
    <section className="blk"><h2>Selected work</h2><ul className="rows">
      {entries.slice(0, 3).map((e) => <li key={e.slug}><span className="mono">{e.year}</span><Link href={entryHref(e)}>{e.title}</Link><span className="mono">{e.status}</span><p>{e.summary}</p></li>)}
    </ul></section>
    <section className="blk"><h2>Library</h2><ul className="rows">
      {collections.map((c) => <li key={c.slug}><span className="mono">LIB</span><Link href={`/${c.slug}`}>{c.name}</Link><span /></li>)}
    </ul></section>
  </>);
}
