import { RichText } from "@/components/RichText";
import type { Entry } from "@/lib/content";
// The one rendering of a record, used by the public page and by the admin preview so "preview" is exactly what visitors will see.
export function EntryView({ e, names, canonical }: { e: Entry; names: Map<string, string>; canonical?: string }) {
  const vocName = (s: string) => names.get(s) ?? s;
  const ld = { "@context": "https://schema.org", "@type": "CreativeWork", name: e.seoTitle || e.title, description: e.seoDescription || e.summary, url: canonical, dateModified: e.updated?.toISOString(), keywords: e.tech.join(", ") };
  return (<article>
    {canonical && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />}
    <p className="mono" style={{ marginTop: "2rem" }}>{e.kind === "projects" ? "PROJECT" : "EXPERIENCE"} / {e.slug.toUpperCase()}</p>
    <h1 style={{ marginTop: ".5rem" }}>{e.title}</h1>
    <p className="lede">{e.summary}</p>
    <dl className="meta">
      {e.year && <><dt className="mono">YEAR</dt><dd>{e.year}</dd></>}
      {e.org && <><dt className="mono">ORGANIZATION</dt><dd>{e.org}</dd></>}
      {e.location && <><dt className="mono">LOCATION</dt><dd>{e.location}</dd></>}
      <dt className="mono">DOMAIN</dt><dd>{e.vocations.map(vocName).join(" / ") || "none yet"}</dd>
      {e.tech.length > 0 && <><dt className="mono">TECHNOLOGY</dt><dd>{e.tech.join(", ")}</dd></>}
      {e.status && <><dt className="mono">STATUS</dt><dd>{e.status}</dd></>}
    </dl>
    <div className="prose"><RichText body={e.body} /></div>
  </article>);
}
