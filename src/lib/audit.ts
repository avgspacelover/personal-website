import { getDb, auditLog } from "../db";
// Who did what, when. Never blocks the action it records.
export async function audit(actor: string, action: string, detail = "") {
  try { await (await getDb()).insert(auditLog).values({ actor: actor.slice(0, 200), action: action.slice(0, 100), detail: detail.slice(0, 300) }); }
  catch (e) { console.error("audit failed", e); }
}
