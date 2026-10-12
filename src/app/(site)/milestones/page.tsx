import Link from "next/link";
import { READING, getAccomplishments, getReadingTable, getSettings, getStats } from "@/lib/queries";
export const dynamic = "force-dynamic";
export async function generateMetadata() { const s = await getSettings(); return { title: s.milestonesTitle, description: s.milestonesIntro, alternates: { canonical: "/milestones" } }; }
const LABEL: Record<string, string> = { essays: "ESSAYS", books: "BOOKS", movies: "MOVIES", series: "SERIES" };
export default async function Milestones() {
  const [s, acc, stats, reading] = await Promise.all([getSettings(), getAccomplishments(), getStats(), getReadingTable()]);
  const year = String(new Date().getUTCFullYear());
  const cur = reading.years.find((y) => y.year === year);
  return (<>
    <h1>{s.milestonesTitle}</h1>
    <p className="lede">{s.milestonesIntro}</p>
    {acc.length > 0 && <section className="blk"><h2>Accomplishments</h2><ul className="rows">
      {acc.map((a) => <li key={a.id}><span className="mono">{a.year}</span><span>{a.url ? <a href={a.url} rel="noopener noreferrer">{a.title}</a> : a.title}{a.figure ? <> <span className="mono">/</span> <strong>{a.figure}</strong></> : null}</span><span className="mono">{a.vocation ? <Link href={`/${a.vocation.slug}`}>{a.vocation.name.toUpperCase()}</Link> : ""}</span>{a.detail && <p>{a.detail}</p>}</li>)}
    </ul></section>}
    {reading.years.length > 0 && <section className="blk"><h2>Reading and watching</h2><div>
      {cur && <p style={{ margin: "0 0 1rem" }} className="mono">{year} SO FAR / {READING.filter((k) => cur[k] > 0).map((k) => `${cur[k]} ${LABEL[k]}`).join(" / ") || "NOTHING YET"}</p>}
      <div className="scroll-x"><table className="ledger"><caption className="sr">Items read or watched per year</caption>
        <thead><tr><th scope="col">YEAR</th>{READING.map((k) => <th scope="col" key={k}>{LABEL[k]}</th>)}</tr></thead>
        <tbody>{reading.years.map((y) => <tr key={y.year} style={y.year === year ? { fontWeight: 600 } : undefined}><th scope="row">{y.year}</th>{READING.map((k) => <td key={k}>{y[k] || "·"}</td>)}</tr>)}</tbody>
        <tfoot><tr><th scope="row">ALL</th>{READING.map((k) => <td key={k}>{reading.totals[k]}</td>)}</tr></tfoot></table></div></div></section>}
    {stats.length > 0 && <section className="blk"><h2>Figures</h2><ul className="rows">
      {stats.map((r) => <li key={r.id}><span className="mono">{r.period}</span><span>{r.url ? <a href={r.url} rel="noopener noreferrer">{r.label}</a> : r.label}{r.note && <p style={{ margin: 0 }}>{r.note}</p>}</span><strong style={{ fontSize: "1.4rem", lineHeight: 1.2 }}>{r.value}</strong></li>)}
    </ul></section>}
    {!acc.length && !stats.length && !reading.years.length && <p className="mono">NOTHING PUBLISHED YET</p>}
  </>);
}
