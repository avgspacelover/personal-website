import { NextResponse, type NextRequest } from "next/server";

// 1) Rate limiting (in memory, per process: fine for one server; use the reverse proxy for more).
// 2) Content-Security-Policy with a per-request nonce, so inline scripts need the nonce and injected ones are blocked.
const buckets = new Map<string, { n: number; reset: number }>();
const RULES: [prefix: string, limit: number, windowMs: number][] = [
  ["/api/auth", 30, 60_000], ["/admin/login", 20, 60_000], ["/search", 30, 60_000], ["/resume/pdf", 6, 60_000], ["/", 600, 60_000],
];
// Behind a reverse proxy the LAST X-Forwarded-For entry is the one our proxy appended; earlier entries are client-supplied.
const clientIp = (req: NextRequest) => req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "local";
function limited(ip: string, path: string) {
  const now = Date.now();
  if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  for (const [prefix, limit, win] of RULES) {
    if (!(prefix === "/" || path === prefix || path.startsWith(prefix + "/"))) continue;
    const key = `${prefix}|${ip}`, b = buckets.get(key);
    if (!b || b.reset < now) { buckets.set(key, { n: 1, reset: now + win }); continue; }
    if (++b.n > limit) return Math.ceil((b.reset - now) / 1000);
  }
  return 0;
}

export function proxy(req: NextRequest) {
  const wait = limited(clientIp(req), req.nextUrl.pathname);
  if (wait) return new NextResponse("Too many requests", { status: 429, headers: { "Retry-After": String(wait) } });

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV !== "production";
  let media = "";
  try { if (process.env.MEDIA_PUBLIC_BASE) media = new URL(process.env.MEDIA_PUBLIC_BASE).origin; } catch {}
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",           // inline style attributes are used throughout; scripts are the real risk
    `img-src 'self' data: blob: ${media}`.trim(),
    "font-src 'self'", "connect-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'",
    "form-action 'self' https://accounts.google.com", // Google sign-in redirect
  ].join("; ");
  const name = process.env.CSP_REPORT_ONLY === "1" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce); headers.set(name, csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set(name, csp);
  return res;
}
export const config = { matcher: [{ source: "/((?!_next/static|_next/image|favicon.ico).*)", missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }] }] };
