import { notFound } from "next/navigation";
import { entries, vocName, entryHref } from "@/lib/content";
type P = { params: { section: string; kind: string; slug: string } };
export const dynamicParams = false;
// Canonical route only: /<primary-vocation>/<kind>/<slug>. Other vocation pages link here.
export const generateStaticParams = () => entries.map((e) => ({ section: e.vocations[0], kind: e.kind, slug: e.slug }));
export function generateMetadata({ params }: P) { return { title: entries.find((e) => e.slug === params.slug)?.title }; }
export default function Detail({ params }: P) {
  const e = entries.find((x) => x.slug === params.slug && x.kind === params.kind);
  if (!e || entryHref(e) !== `/${params.section}/${params.kind}/${params.slug}`) notFound();
  return (<article>
    <p className="mono" style={{ marginTop: "2rem" }}>{e.kind === "projects" ? "PROJECT" : "EXPERIENCE"} / {e.slug.toUpperCase()}</p>
    <h1 style={{ marginTop: ".5rem" }}>{e.title}</h1>
    <p className="lede">{e.summary}</p>
    <dl className="meta">
      <dt className="mono">YEAR</dt><dd>{e.year}</dd>
      {e.org && <><dt className="mono">ORGANIZATION</dt><dd>{e.org}</dd></>}
      <dt className="mono">DOMAIN</dt><dd>{e.vocations.map(vocName).join(" / ")}</dd>
      <dt className="mono">TECHNOLOGY</dt><dd>{e.tech.join(", ")}</dd>
      <dt className="mono">STATUS</dt><dd>{e.status}</dd>
    </dl>
    <div className="prose">{e.body.map((p, i) => <p key={i}>{p}</p>)}</div>
  </article>);
}
