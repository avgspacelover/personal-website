import { getDb, agentRun } from "../../db";
import { runAnthropic } from "./anthropic";
import { runHeuristic, type AgentInput } from "./heuristic";
import { createToolbox } from "./tools";
export type { AgentInput };
export const providerInfo = () => (process.env.ANTHROPIC_API_KEY ? { name: "anthropic", model: process.env.AGENT_MODEL ?? "claude-sonnet-5-5" } : { name: "offline", model: "" });

// Runs the agent and stores the PROPOSAL. Nothing here writes to resumes or content; applying is a separate, human-approved action.
export async function runAgent(input: AgentInput): Promise<string> {
  let tb = createToolbox(input.target), summary = "", provider = providerInfo().name;
  if (provider === "anthropic") {
    try { summary = await runAnthropic(tb, input, { apiKey: process.env.ANTHROPIC_API_KEY!, model: providerInfo().model }); }
    catch (e) { const why = e instanceof Error ? e.message : "error"; tb = createToolbox(input.target); summary = `The model was unavailable (${why}); this is the offline ranking instead. ` + (await runHeuristic(tb, input)); provider = "offline (fallback)"; }
  } else summary = await runHeuristic(tb, input);
  const [row] = await (await getDb()).insert(agentRun).values({ mode: input.mode, target: input.target, provider, resumeId: input.resumeId ?? null, summary, proposal: tb.proposal, log: tb.log }).returning({ id: agentRun.id });
  return row.id;
}
