import { notFound, permanentRedirect } from "next/navigation";
import { entryHref } from "@/lib/content";
import { getEntry, getVocations } from "@/lib/queries";
import { redirectFor } from "@/lib/redirects";
import { RichText } from "@/components/RichText";
import { mediaKeysIn, toDoc } from "@/lib/richtext";
import { mediaUrl } from "@/lib/storage";
type P = { params: Promise<{ section: string; kind: string; slug: string }> };
export const dynamic = "force-dynamic";
// Canonical route only: /<primary-vocation>/<kind>/<slug>. Other vocation pages link here.
export async function generateMetadata(props: P) { const params = await props.params;
  const e = await getEntry(params.kind, params.slug);
  if (!e) return {};
  const path = entryHref(e), img = mediaKeysIn(toDoc(e.body))[0];
  return { title: e.title, description: e.summary, alternates: { canonical: path }, openGraph: { type: "article" as const, title: e.title, description: e.summary, url: path, images: img ? [mediaUrl(img)] : undefined } };
}
export default async function Detail(props: P) { const params = await props.params;
  const e = await getEntry(params.kind, params.slug);
  const names = new Map((await getVocations()).map((v) => [v.slug, v.name]));
  const vocName = (s: string) => names.get(s) ?? s;
  const path = `/${params.section}/${params.kind}/${params.slug}`;
  if (!e) { const to = await redirectFor(path); if (to) permanentRedirect(to); notFound(); }
  if (entryHref(e) !== path) permanentRedirect(entryHref(e)); // same record reached via a non-primary vocation
  const ld = { "@context": "https://schema.org", "@type": "CreativeWork", name: e.title, description: e.summary, dateModified: e.updated?.toISOString(), keywords: e.tech.join(", ") };
  return (<article>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
    <p className="mono" style={{ marginTop: "2rem" }}>{e.kind === "projects" ? "PROJECT" : "EXPERIENCE"} / {e.slug.toUpperCase()}</p>
    <h1 style={{ marginTop: ".5rem" }}>{e.title}</h1>
    <p className="lede">{e.summary}</p>
    <dl className="meta">
      <dt className="mono">YEAR</dt><dd>{e.year}</dd>
      {e.org && <><dt className="mono">ORGANIZATION</dt><dd>{e.org}</dd></>}
      {e.location && <><dt className="mono">LOCATION</dt><dd>{e.location}</dd></>}
      <dt className="mono">DOMAIN</dt><dd>{e.vocations.map(vocName).join(" / ")}</dd>
      <dt className="mono">TECHNOLOGY</dt><dd>{e.tech.join(", ")}</dd>
      <dt className="mono">STATUS</dt><dd>{e.status}</dd>
    </dl>
    <div className="prose"><RichText body={e.body} /></div>
  </article>);
}
