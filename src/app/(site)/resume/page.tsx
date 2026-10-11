import Link from "next/link";
import { entryHref } from "@/lib/content";
import { getEntries, getSkills, getEducation, getVocations } from "@/lib/queries";
import { buildResume, publicResumeId } from "@/lib/resume";
export const metadata = { title: "Resume" };
// Derived view: every item is read from canonical records, nothing is re-entered here.
export const dynamic = "force-dynamic";
export default async function Resume() {
  const pid = await publicResumeId(), m = pid ? await buildResume(pid) : null;
  if (m) return (<>
    <h1>{m.fullName || "Resume"}</h1>
    {m.contact && <p className="mono">{m.contact}</p>}
    {m.headline && <p className="lede">{m.headline}</p>}
    <p style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
      <a className="tbtn big" href="/resume/pdf?template=classic" style={{ textDecoration: "none" }}>DOWNLOAD PDF / SINGLE COLUMN</a>
      <a className="tbtn big" href="/resume/pdf?template=deedy" style={{ textDecoration: "none" }}>DOWNLOAD PDF / TWO COLUMN</a>
    </p>
    {m.sections.map((sec) => <section className="blk" key={sec.key}><h2>{sec.title}</h2><ul className="rows">
      {sec.items.map((i, n) => <li key={n}><span className="mono">{i.period ?? ""}</span><span>{i.href ? <Link href={i.href}>{i.title}</Link> : i.title}{i.sub ? `, ${i.sub}` : ""}</span><span className="mono">{i.location ?? i.meta ?? ""}</span>
        {i.bullets.length > 0 && <div style={{ gridColumn: 2 }}><ul style={{ margin: 0, paddingLeft: "1.1rem" }}>{i.bullets.map((b, k) => <li key={k} style={{ display: "list-item", border: 0, padding: 0 }}>{b}</li>)}</ul></div>}</li>)}
    </ul></section>)}
  </>);
  const [entries, skills, education, vs] = await Promise.all([getEntries(), getSkills(), getEducation(), getVocations()]);
  const vocName = (s: string) => vs.find((v) => v.slug === s)?.name ?? s;
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
