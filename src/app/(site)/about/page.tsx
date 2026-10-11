import { Elsewhere } from "@/components/Elsewhere";
import { RichText } from "@/components/RichText";
import { getSettings } from "@/lib/queries";
import { toDoc } from "@/lib/richtext";
export const metadata = { title: "About" };
export default async function About() {
  const s = await getSettings();
  const has = toDoc(s.aboutBody).content.length > 0;
  return (<>
    <h1>About</h1>
    {has ? <div className="prose"><RichText body={s.aboutBody} /></div> : <p className="lede">{s.intro}</p>}
    <Elsewhere s={s} />
  </>);
}
