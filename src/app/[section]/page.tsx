import Link from "next/link";
import { notFound } from "next/navigation";
import { vocations, collections, library, inVocation, entryHref } from "@/lib/content";
type P = { params: { section: string } };
export const dynamicParams = false;
export const generateStaticParams = () => [...vocations, ...collections].map((s) => ({ section: s.slug }));
export function generateMetadata({ params }: P) { const s = [...vocations, ...collections].find((x) => x.slug === params.section); return { title: s?.name }; }
export default function Section({ params }: P) {
  const v = vocations.find((x) => x.slug === params.section);
  if (v) {
    const all = inVocation(v.slug);
    return (<>
      <h1>{v.name}</h1><p className="lede">{v.intro}</p>
      {(["experience", "projects"] as const).map((k) => (
        <section className="blk" key={k}><h2>{k === "projects" ? "Projects" : "Experience"}</h2>
          <ul className="rows">{all.filter((e) => e.kind === k).map((e) => <li key={e.slug}><span className="mono">{e.year}</span><Link href={entryHref(e)}>{e.title}{e.org ? `, ${e.org}` : ""}</Link><span className="mono">{e.status}</span><p>{e.summary}</p></li>)}
            {!all.some((e) => e.kind === k) && <li><span className="mono">EMPTY</span><span>No published {k} yet.</span><span /></li>}
          </ul></section>))}
    </>);
  }
  const c = collections.find((x) => x.slug === params.section);
  if (!c) notFound();
  return (<>
    <h1>{c.name}</h1><p className="lede">Personal recommendations, independent of the professional archive.</p>
    <section className="blk"><h2>Entries</h2><ul className="rows">
      {library[c.slug].map((i) => <li key={i.title}><span className="mono">{i.year ?? "n/a"}</span><span>{i.url ? <a href={i.url}>{i.title}</a> : i.title}, {i.by}</span><span className="mono">{i.rating}</span><p>{i.note}</p></li>)}
    </ul></section>
  </>);
}
