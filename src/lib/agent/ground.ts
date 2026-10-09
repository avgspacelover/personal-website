// Grounding: everything the agent proposes is checked here, server-side, against canonical records. The model is never trusted.
export type Rec = { id: string; kind: "projects" | "experience"; title: string; org: string; period: string; location: string; tech: string[]; summary: string; body: string; vocations: string[]; path: string | null };
const STOP = new Set("a an and are as at be but by for from has have in into is it its of on or our that the their this to we with you your will can able using use used work working experience years year strong knowledge skills ability team who what when where which about across including such other more most per etc looking seeking join role candidate candidates responsibilities requirements preferred plus ideal opportunity company".split(" "));
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
export const tokens = (s: string) => norm(s).split(/[^a-z0-9+#.]+/).map((t) => t.replace(/^\.+|\.+$/g, "")).filter(Boolean);

export function terms(text: string): { term: string; w: number }[] {
  const counts = new Map<string, number>();
  for (const t of tokens(text)) if (t.length > 1 && !STOP.has(t) && !/^\d+$/.test(t)) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].map(([term, n]) => ({ term, w: 1 + Math.log(n) })).sort((a, b) => b.w - a.w).slice(0, 40);
}
const FIELD_W = { title: 5, tech: 4, summary: 3, org: 2, voc: 2, body: 1 } as const;
export function relevance(r: Rec, ts: { term: string; w: number }[]) {
  const f = { title: new Set(tokens(r.title)), tech: new Set(tokens(r.tech.join(" "))), summary: new Set(tokens(r.summary)), org: new Set(tokens(r.org)), voc: new Set(tokens(r.vocations.join(" "))), body: new Set(tokens(r.body)) };
  let score = 0; const matched: string[] = [];
  for (const { term, w } of ts) {
    const best = Math.max(0, ...(Object.keys(FIELD_W) as (keyof typeof FIELD_W)[]).map((k) => (f[k].has(term) ? FIELD_W[k] : 0)));
    if (best) { score += best * w; matched.push(term); }
  }
  return { score, matched };
}
export const corpus = (r: Rec) => [r.title, r.org, r.location, r.period, r.tech.join(" "), r.summary, r.body].join("\n");

// A bullet is accepted only if (1) it quotes evidence that really appears in the record, (2) every number in it appears in the record,
// (3) every capitalised/technical term in it appears in the record.
export function validateBullet(b: { text: string; evidence: string }, r: Rec): string | null {
  const text = b.text.trim(), c = norm(corpus(r)), ev = norm(b.evidence ?? "");
  if (!text || text.length > 300) return "empty or longer than 300 characters";
  if (ev.length < 12 || !c.includes(ev)) return "evidence quote not found in the source record";
  for (const n of text.match(/\d[\d,.]*%?/g) ?? []) if (!c.includes(n.replace(/[.,]$/, "").toLowerCase())) return `number "${n}" is not in the source record`;
  const words = text.split(/\s+/).slice(1).map((w) => w.replace(/^[("']+|[)"',;:.!?]+$/g, ""));
  for (const w of words) if (/^[A-Z]/.test(w) || /[0-9+#]|[a-z][A-Z]/.test(w)) if (w && !c.includes(w.toLowerCase())) return `term "${w}" is not in the source record`;
  return null;
}
export const sentences = (s: string) => s.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter((x) => x.length >= 12);
