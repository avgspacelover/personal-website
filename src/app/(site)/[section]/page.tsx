import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { redirectFor } from "@/lib/redirects";
import { collections, entryHref } from "@/lib/content";
import { getAccomplishments, getVocations, getEntries, getLibrary } from "@/lib/queries";
type P = { params: Promise<{ section: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata(props: P) { const params = await props.params; const s = [...(await getVocations()), ...collections].find((x) => x.slug === params.section); return { title: s?.name, alternates: { canonical: `/${params.section}` } }; }
export default async function Section(props: P) { const params = await props.params;
  const v = (await getVocations()).find((x) => x.slug === params.section);
  if (v) {
    const all = await getEntries({ vocation: v.slug });
    const acc = await getAccomplishments({ vocation: v.slug });
    return (<>
      <h1>{v.name}</h1><p className="lede">{v.intro}</p>
      {(["experience", "projects"] as const).map((k) => (
        <section className="blk" key={k}><h2>{k === "projects" ? "Projects" : "Experience"}</h2>
          <ul className="rows">{all.filter((e) => e.kind === k).map((e) => <li key={e.slug}><span className="mono">{e.year}</span><Link href={entryHref(e)}>{e.title}{e.org ? `, ${e.org}` : ""}</Link><span className="mono">{e.status}</span><p>{e.summary}</p></li>)}
            {!all.some((e) => e.kind === k) && <li><span className="mono">EMPTY</span><span>No published {k} yet.</span><span /></li>}
          </ul></section>))}
      {acc.length > 0 && <section className="blk"><h2>Accomplishments</h2><ul className="rows">
        {acc.map((a) => <li key={a.id}><span className="mono">{a.year}</span><span>{a.url ? <a href={a.url} rel="noopener noreferrer">{a.title}</a> : a.title}{a.figure ? <> <span className="mono">/</span> <strong>{a.figure}</strong></> : null}</span><span />{a.detail && <p>{a.detail}</p>}</li>)}
      </ul></section>}
    </>);
  }
  const c = collections.find((x) => x.slug === params.section);
  if (!c) { const to = await redirectFor(`/${params.section}`); if (to) permanentRedirect(to); notFound(); }
  return (<>
    <h1>{c.name}</h1><p className="lede">Personal recommendations, independent of the professional archive.</p>
    <section className="blk"><h2>Entries</h2><ul className="rows">
      {(await getLibrary(c.slug)).map((i) => <li key={i.title}><span className="mono">{i.year ?? "n/a"}</span><span>{i.image && <img src={i.image.url} alt={i.image.alt} width={48} loading="lazy" style={{ display: "block", marginBottom: ".4rem" }} />}{i.url ? <a href={i.url}>{i.title}</a> : i.title}{i.by ? `, ${i.by}` : ""}</span><span className="mono">{i.rating}</span><p>{i.note}{i.tags?.length ? <span className="mono"> / {i.tags.map((t, k) => <span key={t}>{k ? " / " : ""}<Link href={`/search?q=${encodeURIComponent(t)}`}>{t}</Link></span>)}</span> : null}</p></li>)}
    </ul></section>
  </>);
}
