import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE, destroySession, sameOrigin } from "@/lib/auth";
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response("Forbidden", { status: 403 });
  await destroySession(cookies().get(COOKIE)?.value);
  const res = NextResponse.redirect(new URL("/admin/login", req.url), 303);
  res.cookies.delete(COOKIE);
  return res;
}
