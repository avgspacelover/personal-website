const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
export const parseTerms = (q: string) => norm(q).split(/\s+/).filter(Boolean).slice(0, 8).map((t) => t.slice(0, 50));
// Every term must appear in some field; each term contributes the weight of its best-matching field.
export function score(fields: [text: string, weight: number][], terms: string[]) {
  const f = fields.map(([t, w]) => [norm(t), w] as const);
  let total = 0;
  for (const t of terms) {
    let best = 0;
    for (const [text, w] of f) if (w > best && text.includes(t)) best = w;
    if (!best) return 0;
    total += best;
  }
  return total;
}
