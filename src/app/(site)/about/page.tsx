import { Elsewhere } from "@/components/Elsewhere";
import { RichText } from "@/components/RichText";
import { site } from "@/lib/content";
import { getSettings } from "@/lib/queries";
import { buildResume, publicResumeId } from "@/lib/resume";
import { docText, toDoc } from "@/lib/richtext";
import type { Metadata } from "next";
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const aboutText = docText(toDoc(s.aboutBody));
  const description = (aboutText || s.intro || s.metaDescription).slice(0, 160);
  return {
    title: "About", description, alternates: { canonical: "/about" },
    openGraph: { type: "profile", siteName: s.siteName, title: `About / ${s.siteName}`, description, url: "/about" },
    twitter: { card: "summary", title: `About / ${s.siteName}`, description },
  };
}
export default async function About() {
  const [s, resumeId] = await Promise.all([getSettings(), publicResumeId()]);
  const profile = resumeId ? await buildResume(resumeId) : null;
  const has = toDoc(s.aboutBody).content.length > 0;
  const personName = profile?.fullName.trim();
  const sameAs = s.links.map((link) => link.url).filter((url) => /^https:\/\//i.test(url));
  const person = personName ? {
    "@type": "Person", "@id": `${site.url}/about#person`, name: personName,
    url: `${site.url}/about`,
    ...(sameAs.length ? { sameAs } : {}),
    ...(s.contactEmail ? { email: `mailto:${s.contactEmail}` } : {}),
  } : null;
  const profilePage = {
    "@context": "https://schema.org", "@type": "ProfilePage", "@id": `${site.url}/about#profile`, url: `${site.url}/about`, name: "About",
    ...(person ? { mainEntity: { "@id": `${site.url}/about#person` } } : {}),
  };
  return (<>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person ? [profilePage, person] : profilePage).replace(/</g, "\\u003c") }} />
    <h1>About</h1>
    {personName && <p className="lede">{personName}</p>}
    {has ? <div className="prose"><RichText body={s.aboutBody} /></div> : <p className="lede">{s.intro}</p>}
    <Elsewhere s={s} />
  </>);
}
