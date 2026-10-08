import Link from "next/link";
import { entries, entryHref, skills, education, vocName } from "@/lib/content";
export const metadata = { title: "Resume" };
// Derived view: every item is read from canonical records, nothing is re-entered here.
export default function Resume() {
  const exp = entries.filter((e) => e.kind === "experience");
  const proj = entries.filter((e) => e.kind === "projects");
  return (<>
    <h1>Resume</h1>
    <p className="lede">General version. Generated from the professional archive.</p>
    <section className="blk"><h2>Experience</h2><ul className="rows">
      {exp.map((e) => <li key={e.slug}><span className="mono">{e.year}</span><Link href={entryHref(e)}>{e.title}, {e.org}</Link><span className="mono">{e.vocations.map(vocName).join(" / ")}</span><p>{e.summary}</p></li>)}
    </ul></section>
    <section className="blk"><h2>Projects</h2><ul className="rows">
      {proj.map((e) => <li key={e.slug}><span className="mono">{e.year}</span><Link href={entryHref(e)}>{e.title}</Link><span className="mono">{e.tech.join(", ")}</span><p>{e.summary}</p></li>)}
    </ul></section>
    <section className="blk"><h2>Skills</h2><ul className="rows">
      {skills.map((s) => <li key={s.category}><span className="mono">{s.category}</span><span>{s.items.join(", ")}</span><span /></li>)}
    </ul></section>
    <section className="blk"><h2>Education</h2><ul className="rows">
      {education.map((d) => <li key={d.institution}><span className="mono">{d.dates}</span><span>{d.institution}, {d.program}</span><span /></li>)}
    </ul></section>
  </>);
}
