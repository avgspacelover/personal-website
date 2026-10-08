import { NextResponse } from "next/server";
import { COOKIE, clearFailures, cookieOptions, createSession, loginAllowed, recordFailure, sameOrigin } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
const back = (req: Request, e: string) => NextResponse.redirect(new URL(`/admin/login?error=${e}`, req.url), 303);
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response("Forbidden", { status: 403 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!process.env.ADMIN_PASSWORD_HASH) return back(req, "config");
  if (!loginAllowed(ip)) return back(req, "rate");
  const pw = String((await req.formData()).get("password") ?? "");
  if (!verifyPassword(pw)) { recordFailure(ip); return back(req, "1"); }
  clearFailures(ip);
  const res = NextResponse.redirect(new URL("/admin", req.url), 303);
  res.cookies.set(COOKIE, await createSession(), cookieOptions);
  return res;
}
