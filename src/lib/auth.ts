import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { allowed } from "./allowlist";

// The allowlist is re-checked on every request, so removing an email from ADMIN_EMAILS revokes access immediately.
export async function getAdmin() {
  const s = await auth();
  return allowed(s?.user?.email);
}
// CSRF for route handlers: POSTs must carry an Origin matching the host (server actions get Next's own check).
export function sameOrigin(req: Request) {
  const o = req.headers.get("origin"), host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try { return !!o && new URL(o).host === host; } catch { return false; }
}
// Layouts do not re-run on client navigation, so every admin page and mutation must call this itself.
export async function requireAdmin() {
  if (!(await getAdmin())) redirect("/admin/login");
}
