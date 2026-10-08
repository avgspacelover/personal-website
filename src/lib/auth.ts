import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, lt } from "drizzle-orm";
import { getDb, session } from "../db";

export const COOKIE = "session";
const TTL_MS = 7 * 24 * 3600 * 1000;
const sha = (t: string) => createHash("sha256").update(t).digest("hex");
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge: TTL_MS / 1000 };

export async function createSession() {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  await db.delete(session).where(lt(session.expiresAt, new Date()));
  await db.insert(session).values({ tokenHash: sha(token), expiresAt: new Date(Date.now() + TTL_MS) });
  return token;
}
export async function destroySession(token?: string) {
  if (token) await (await getDb()).delete(session).where(eq(session.tokenHash, sha(token)));
}
export async function getAdmin() {
  const t = cookies().get(COOKIE)?.value;
  if (!t) return false;
  const rows = await (await getDb()).select({ id: session.id }).from(session).where(and(eq(session.tokenHash, sha(t)), gt(session.expiresAt, new Date()))).limit(1);
  return rows.length > 0;
}
// Layouts do not re-run on client navigation, so every admin page and mutation must call this itself.
export async function requireAdmin() {
  if (!(await getAdmin())) redirect("/admin/login");
}

// CSRF for route handlers: cookie is SameSite=Strict, and POSTs must carry a matching Origin.
export function sameOrigin(req: Request) {
  const o = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try { return !!o && new URL(o).host === host; } catch { return false; }
}

// In-memory limiter: 5 failures per IP per 15 minutes. Per-process; move to the DB if you run multiple instances.
const fails = new Map<string, { n: number; reset: number }>();
export const loginAllowed = (ip: string) => { const f = fails.get(ip); return !f || f.reset < Date.now() || f.n < 5; };
export function recordFailure(ip: string) {
  const f = fails.get(ip);
  if (fails.size > 1000) fails.clear();
  fails.set(ip, f && f.reset > Date.now() ? { n: f.n + 1, reset: f.reset } : { n: 1, reset: Date.now() + 15 * 60 * 1000 });
}
export const clearFailures = (ip: string) => fails.delete(ip);
