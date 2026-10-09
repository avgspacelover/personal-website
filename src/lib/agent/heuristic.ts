import { getSkills } from "../queries";
import { sentences, tokens, relevance, type Rec } from "./ground";
import type { Toolbox } from "./tools";
export type AgentInput = { mode: "create" | "tailor" | "gap" | "improve" | "rank"; target: string; resumeId?: string | null; existingBullets?: string };

// Offline provider: no model, no cost, no data leaves the server. Ranks records by weighted term overlap with the target,
// proposes VERBATIM sentences from the records as bullets, and lists target terms with no evidence anywhere.
export async function runHeuristic(tb: Toolbox, input: AgentInput): Promise<string> {
  const recs = await tb.records();
  await tb.call("create_resume", { name: input.mode === "rank" ? "Project ranking" : `Tailored: ${input.target.split("\n")[0].slice(0, 60) || "role"}` });
  const top = (kind: Rec["kind"], n: number) => recs.filter((r) => r.kind === kind).map((r) => ({ r, ...relevance(r, tb.ts) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, n);
  const chosen = input.mode === "gap" ? [] : [...top("experience", input.mode === "rank" ? 0 : 3), ...top("projects", input.mode === "rank" ? 6 : 4)];
  for (const { r, matched } of chosen) {
    const bullets = input.mode === "rank" ? [] : [...sentences(r.summary), ...sentences(r.body)].map((s) => ({ s, hits: tokens(s).filter((t) => matched.includes(t)).length })).sort((a, b) => b.hits - a.hits).slice(0, 2).map(({ s }) => ({ text: s, evidence: s }));
    await tb.call("add_to_resume", { id: r.id, bullets });
  }
  const skills = (await getSkills()).map((s) => `${s.category} ${s.items.join(" ")}`).join(" ");
  const have = new Set([...recs.flatMap((r) => tokens([r.title, r.org, r.tech.join(" "), r.summary, r.body, r.vocations.join(" ")].join(" "))), ...tokens(skills)]);
  const missing = tb.ts.slice(0, 15).filter((t) => !have.has(t.term));
  for (const t of missing) await tb.call("note_gap", { term: t.term, note: "no evidence in published records" });
  if (input.mode === "improve") return "Rewording existing bullets needs a language-model provider (set ANTHROPIC_API_KEY). Offline mode only ranks records and proposes verbatim source sentences.";
  return `Offline ranking: ${tb.proposal.picks.length} record(s) selected by weighted term overlap; bullets are verbatim sentences from the records. ${missing.length ? `${missing.length} target term(s) have no evidence in the archive.` : "Every key target term appears somewhere in the archive."}`;
}
