import { Elsewhere } from "@/components/Elsewhere";
import { RichText } from "@/components/RichText";
import { site } from "@/lib/content";
import { getSettings } from "@/lib/queries";
import { buildResume, publicResumeId } from "@/lib/resume";
import { docText, toDoc } from "@/lib/richtext";
import { aboutMetadata, profilePageJsonLd, serializeJsonLd } from "@/lib/seo";
import type { Metadata } from "next";
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const aboutText = docText(toDoc(s.aboutBody));
  return aboutMetadata(s, aboutText);
}
export default async function About() {
  const [s, resumeId] = await Promise.all([getSettings(), publicResumeId()]);
  const profile = resumeId ? await buildResume(resumeId) : null;
  const has = toDoc(s.aboutBody).content.length > 0;
  const personName = profile?.fullName.trim();
  const profilePage = profilePageJsonLd(site.url, personName, s.links, s.contactEmail);
  return (<>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(profilePage) }} />
    <h1>About</h1>
    {personName && <p className="lede">{personName}</p>}
    {has ? <div className="prose"><RichText body={s.aboutBody} /></div> : <p className="lede">{s.intro}</p>}
    <Elsewhere s={s} />
  </>);
}
