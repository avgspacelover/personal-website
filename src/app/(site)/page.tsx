import Link from "next/link";
import { entryHref, collections } from "@/lib/content";
import { getVocations, getEntries, getSettings } from "@/lib/queries";
import { Elsewhere } from "@/components/Elsewhere";
import { RichText } from "@/components/RichText";
import { toDoc } from "@/lib/richtext";
export const dynamic = "force-dynamic";

export default async function Home() {
  const [vocations, entries, featured, settings] = await Promise.all([getVocations(), getEntries(), getEntries({ featured: true }), getSettings()]);
  const inVocation = (s: string) => entries.filter((e) => e.vocations.includes(s));
  return (<>
    <h1>{settings.tagline}</h1>
    <p className="lede">{settings.intro}</p>
    <section className="blk"><h2>Vocations</h2><ul className="rows">
      {vocations.map((v, i) => <li key={v.slug}><span className="mono">V / {String(i + 1).padStart(3, "0")}</span><Link href={`/${v.slug}`}>{v.name}</Link><span className="mono">{inVocation(v.slug).length} RECORD{inVocation(v.slug).length === 1 ? "" : "S"}</span><p>{v.intro}</p></li>)}
    </ul></section>
    {toDoc(settings.currently).content.length > 0 && <section className="blk"><h2>Currently</h2><div className="prose"><RichText body={settings.currently} /></div></section>}
    <section className="blk"><h2>Selected work</h2><ul className="rows">
      {featured.map((e) => <li key={e.slug}><span className="mono">{e.year}</span><Link href={entryHref(e)}>{e.title}</Link><span className="mono">{e.status}</span><p>{e.summary}</p></li>)}
    </ul></section>
    <section className="blk"><h2>Library</h2><ul className="rows">
      {collections.map((c) => <li key={c.slug}><span className="mono">LIB</span><Link href={`/${c.slug}`}>{c.name}</Link><span /></li>)}
    </ul></section>
    <Elsewhere s={settings} />
  </>);
}
