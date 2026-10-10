const prod = process.env.NODE_ENV === "production";
// Per-request CSP (with nonce) and rate limiting live in src/proxy.ts; these are the static headers.
const headers = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(prod ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];
export default {
  poweredByHeader: false,
  serverExternalPackages: ["@electric-sql/pglite", "postgres", "sharp", "pdfkit"],
  images: { unoptimized: true }, // next/image is unused; this also turns off the /_next/image endpoint
  async headers() { return [{ source: "/:path*", headers }]; },
};
