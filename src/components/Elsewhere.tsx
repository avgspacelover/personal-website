import type { Settings } from "@/lib/queries";
// Intentionally published contact details only: nothing renders unless the owner entered it in Site settings.
export function Elsewhere({ s }: { s: Settings }) {
  if (!s.contactEmail && !s.links.length) return null;
  return (
    <section className="blk"><h2>Elsewhere</h2><ul className="rows">
      {s.contactEmail && <li><span className="mono">EMAIL</span><a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a><span /></li>}
      {s.links.map((l) => <li key={l.url}><span className="mono">LINK</span><a href={l.url} rel="noopener noreferrer me">{l.label}</a><span /></li>)}
    </ul></section>
  );
}
