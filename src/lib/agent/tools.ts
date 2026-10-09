import { renderResumePdf } from "../resume-pdf";
import { allRecords } from "./records";
import { corpus, relevance, terms, validateBullet, type Rec } from "./ground";

export type Pick = { id: string; kind: Rec["kind"]; title: string; path: string | null; score: number; reasons: string[]; bullets: { text: string; evidence: string }[] };
export type Proposal = { name: string; picks: Pick[]; rejected: { id: string; title: string; text: string; reason: string }[]; gaps: string[] };
export type LogEntry = { tool: string; args: unknown; result: string };
const str = (v: unknown, n = 300) => (typeof v === "string" ? v.slice(0, n) : "");
const bulletsOf = (v: unknown) => (Array.isArray(v) ? v.slice(0, 6) : []).map((b: any) => ({ text: str(b?.text), evidence: str(b?.evidence, 600) }));

const bullet = { type: "object", properties: { text: { type: "string", description: "One resume bullet, max 300 chars. Only facts present in the record." }, evidence: { type: "string", description: "A verbatim quote (12+ chars) copied from the record that supports the bullet." } }, required: ["text", "evidence"] };
const q = { type: "object", properties: { query: { type: "string" } }, required: ["query"] };
const idOnly = { type: "object", properties: { id: { type: "string" } }, required: ["id"] };
export const DEFINITIONS = [
  { name: "search_projects", description: "Search published projects; returns brief matches ranked by relevance.", input_schema: q },
  { name: "search_experience", description: "Search published experience entries; returns brief matches ranked by relevance.", input_schema: q },
  { name: "get_project", description: "Full canonical record of a project (the only source of facts you may use).", input_schema: idOnly },
  { name: "get_experience", description: "Full canonical record of an experience entry (the only source of facts you may use).", input_schema: idOnly },
  { name: "create_resume", description: "Name the proposed resume draft.", input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
  { name: "add_to_resume", description: "Propose including a record, optionally with grounded bullets. Invalid bullets are rejected with a reason.", input_schema: { type: "object", properties: { id: { type: "string" }, bullets: { type: "array", items: bullet } }, required: ["id"] } },
  { name: "remove_from_resume", description: "Remove a record from the proposal.", input_schema: idOnly },
  { name: "rewrite_bullet", description: "Propose a reworded bullet for a record. It must be supported by the record; validated server-side.", input_schema: { type: "object", properties: { source_id: { type: "string" }, instruction: { type: "string" }, text: { type: "string" }, evidence: { type: "string" } }, required: ["source_id", "text", "evidence"] } },
  { name: "note_gap", description: "Record a requirement of the target role for which the records contain no evidence.", input_schema: { type: "object", properties: { term: { type: "string" }, note: { type: "string" } }, required: ["term"] } },
  { name: "generate_pdf", description: "Render the current proposal as a PDF to check whether it fits one page. Returns page count only.", input_schema: { type: "object", properties: {} } },
];

// All agent capabilities live here. Tools can read published records and edit ONLY the in-memory proposal:
// they cannot touch canonical content, other tables, or publish anything. A human applies the proposal.
export function createToolbox(target: string) {
  const ts = terms(target), log: LogEntry[] = [];
  const proposal: Proposal = { name: "", picks: [], rejected: [], gaps: [] };
  let cache: Rec[] | null = null;
  const recs = async () => (cache ??= await allRecords());
  const brief = (r: Rec) => ({ id: r.id, title: r.title, organization: r.org || undefined, period: r.period, tech: r.tech, summary: r.summary });
  const search = async (kind: Rec["kind"], query: string) => {
    const qt = query.trim() ? terms(query) : ts;
    return (await recs()).filter((r) => r.kind === kind).map((r) => ({ r, ...relevance(r, qt) })).sort((a, b) => b.score - a.score).slice(0, 8).map((x) => ({ ...brief(x.r), relevance: Math.round(x.score * 10) / 10 }));
  };
  const pickFor = async (id: string) => {
    const r = (await recs()).find((x) => x.id === id);
    if (!r) return null;
    let p = proposal.picks.find((x) => x.id === id);
    if (!p) { const rel = relevance(r, ts); p = { id, kind: r.kind, title: r.title, path: r.path, score: Math.round(rel.score * 10) / 10, reasons: rel.matched.slice(0, 8), bullets: [] }; proposal.picks.push(p); }
    return { r, p };
  };
  const accept = (r: Rec, p: Pick, list: { text: string; evidence: string }[]) => {
    const rejected: { text: string; reason: string }[] = [];
    for (const b of list) {
      const why = validateBullet(b, r);
      if (why) { rejected.push({ text: b.text, reason: why }); proposal.rejected.push({ id: r.id, title: r.title, text: b.text, reason: why }); }
      else if (p.bullets.length < 5 && !p.bullets.some((x) => x.text === b.text.trim())) p.bullets.push({ text: b.text.trim(), evidence: b.evidence.trim() });
    }
    return { bulletsNow: p.bullets.length, rejected };
  };
  const handlers: Record<string, (a: any) => Promise<unknown>> = {
    search_projects: (a) => search("projects", str(a.query)), search_experience: (a) => search("experience", str(a.query)),
    get_project: async (a) => { const r = (await recs()).find((x) => x.id === str(a.id) && x.kind === "projects"); return r ? { ...brief(r), location: r.location, details: r.body.slice(0, 3000) } : { error: "unknown project id" }; },
    get_experience: async (a) => { const r = (await recs()).find((x) => x.id === str(a.id) && x.kind === "experience"); return r ? { ...brief(r), location: r.location, details: r.body.slice(0, 3000) } : { error: "unknown experience id" }; },
    create_resume: async (a) => { proposal.name = str(a.name, 100); return { ok: true }; },
    add_to_resume: async (a) => { const x = await pickFor(str(a.id)); return x ? accept(x.r, x.p, bulletsOf(a.bullets)) : { error: "unknown record id" }; },
    remove_from_resume: async (a) => { proposal.picks = proposal.picks.filter((p) => p.id !== str(a.id)); return { ok: true }; },
    rewrite_bullet: async (a) => { const x = await pickFor(str(a.source_id)); return x ? accept(x.r, x.p, [{ text: str(a.text), evidence: str(a.evidence, 600) }]) : { error: "unknown record id" }; },
    note_gap: async (a) => { if (proposal.gaps.length < 20) proposal.gaps.push(`${str(a.term, 60)}${a.note ? `: ${str(a.note, 200)}` : ""}`); return { ok: true }; },
    generate_pdf: async () => {
      const sec = (k: Rec["kind"]) => ({ key: k, title: k === "projects" ? "Projects" : "Experience", items: proposal.picks.filter((p) => p.kind === k).map((p) => ({ title: p.title, bullets: p.bullets.map((b) => b.text) })) });
      const r = await renderResumePdf({ id: "preview", name: proposal.name || "Preview", template: "classic", pages: "one", fullName: "", contact: "", headline: "", sections: [sec("experience"), sec("projects")].filter((s) => s.items.length) });
      return { pages: r.pages, fits_one_page: r.fits };
    },
  };
  return {
    ts, proposal, log, records: recs, corpusOf: corpus,
    async call(name: string, args: unknown) {
      let out: string;
      try { const h = handlers[name]; out = JSON.stringify(h ? await h((args && typeof args === "object" ? args : {}) as object) : { error: `unknown tool ${name}` }); }
      catch (e) { out = JSON.stringify({ error: e instanceof Error ? e.message : "tool failed" }); }
      log.push({ tool: name, args, result: out.slice(0, 500) });
      return out;
    },
  };
}
export type Toolbox = ReturnType<typeof createToolbox>;
