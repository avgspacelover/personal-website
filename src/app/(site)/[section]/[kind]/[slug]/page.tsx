import { notFound } from "next/navigation";
import { entryHref } from "@/lib/content";
import { getEntry, getVocations } from "@/lib/queries";
import { RichText } from "@/components/RichText";
type P = { params: { section: string; kind: string; slug: string } };
export const dynamic = "force-dynamic";
// Canonical route only: /<primary-vocation>/<kind>/<slug>. Other vocation pages link here.
export async function generateMetadata({ params }: P) { return { title: (await getEntry(params.kind, params.slug))?.title }; }
export default async function Detail({ params }: P) {
  const e = await getEntry(params.kind, params.slug);
  const names = new Map((await getVocations()).map((v) => [v.slug, v.name]));
  const vocName = (s: string) => names.get(s) ?? s;
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
    <div className="prose"><RichText body={e.body} /></div>
  </article>);
}
