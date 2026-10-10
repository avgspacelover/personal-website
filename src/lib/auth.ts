import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { allowed } from "./allowlist";
import { audit } from "./audit";

// The allowlist is re-checked on every request, so removing an email from ADMIN_EMAILS revokes access immediately.
// SESSIONS_VALID_AFTER (ISO date) revokes every session issued before it: set it to "now" and restart to sign everyone out.
export async function adminEmail(): Promise<string | null> {
  const s = await auth();
  const email = s?.user?.email;
  if (!allowed(email)) return null;
  const cutoff = Date.parse(process.env.SESSIONS_VALID_AFTER ?? "");
  const iat = (s as unknown as { iat?: number }).iat ?? 0;
  if (!Number.isNaN(cutoff) && iat * 1000 < cutoff) return null;
  return email!;
}
export const getAdmin = async () => (await adminEmail()) !== null;
// Layouts do not re-run on client navigation, so every admin page and mutation must call this itself.
// Pass an action name from mutating server actions to record it in the audit log.
export async function requireAdmin(action?: string) {
  const who = await adminEmail();
  if (!who) redirect("/admin/login");
  if (action) await audit(who, action);
  return who;
}
// CSRF for route handlers: POSTs must carry an Origin matching the host (server actions get Next's own check).
export function sameOrigin(req: Request) {
  const o = req.headers.get("origin"), host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try { return !!o && new URL(o).host === host; } catch { return false; }
}
