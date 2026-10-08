import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { allowed } from "./allowlist";

// The allowlist is re-checked on every request, so removing an email from ADMIN_EMAILS revokes access immediately.
export async function getAdmin() {
  const s = await auth();
  return allowed(s?.user?.email);
}
// Layouts do not re-run on client navigation, so every admin page and mutation must call this itself.
export async function requireAdmin() {
  if (!(await getAdmin())) redirect("/admin/login");
}
