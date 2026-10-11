import { desc } from "drizzle-orm";
import { getDb, mediaAsset } from "@/db";
import { RichEditor } from "@/components/RichEditor";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { toDoc } from "@/lib/richtext";
import { mediaUrl, variantKeys } from "@/lib/storage";
import { saveSettings } from "./actions";
export const metadata = { title: "Site settings" };
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  await requireAdmin();
  const sp = await searchParams, s = await getSettings();
  const assets = await (await getDb()).select().from(mediaAsset).orderBy(desc(mediaAsset.createdAt)).limit(60);
  const media = assets.map((a) => ({ url: mediaUrl(a.key), thumb: mediaUrl(a.variants.includes(480) ? variantKeys(a.key, [480])[0] : a.key), alt: a.alt }));
  const F = (id: string, label: string, el: React.ReactNode) => <><label className="mono" htmlFor={id}>{label}</label>{el}</>;
  return (<>
    <h1>Site settings</h1>
    <p className="lede">Text shown across the public site. Blank fields use the defaults.</p>
    <form action={saveSettings} className="login edit" style={{ maxWidth: "46rem" }}>
      {sp.error && <p role="alert" className="err">{sp.error === "email" ? "Enter a valid contact email or leave it blank." : "A rich-text field could not be read; reload and try again."}</p>}
      {sp.saved && <p role="status" className="err">Saved.</p>}
      {F("siteName", "SITE NAME", <input id="siteName" name="siteName" maxLength={100} defaultValue={s.siteName} />)}
      {F("tagline", "HOMEPAGE HEADLINE", <input id="tagline" name="tagline" maxLength={200} defaultValue={s.tagline} />)}
      {F("intro", "HOMEPAGE INTRO", <textarea id="intro" name="intro" rows={3} maxLength={400} defaultValue={s.intro} />)}
      {F("metaDescription", "SEARCH/SHARE DESCRIPTION (DEFAULT)", <textarea id="metaDescription" name="metaDescription" rows={2} maxLength={300} defaultValue={s.metaDescription} />)}
      <span className="mono">CURRENTLY (HOMEPAGE: WHAT YOU ARE WORKING ON, LEARNING, READING)</span>
      <RichEditor name="currently" initial={toDoc(s.currently)} media={media} />
      <span className="mono">ABOUT PAGE</span>
      <RichEditor name="aboutBody" initial={toDoc(s.aboutBody)} media={media} />
      {F("contactEmail", "PUBLIC CONTACT EMAIL (SHOWN ON THE SITE; BLANK = NONE)", <input id="contactEmail" name="contactEmail" type="email" maxLength={200} defaultValue={s.contactEmail} />)}
      {F("links", "ELSEWHERE LINKS (ONE PER LINE: LABEL | URL)", <textarea id="links" name="links" rows={4} defaultValue={s.links.map((l) => `${l.label} | ${l.url}`).join("\n")} />)}
      <button className="tbtn big">SAVE</button>
    </form>
  </>);
}
