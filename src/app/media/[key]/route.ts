import { CONTENT_TYPES, KEY_RE, getStorage } from "@/lib/storage";
// Public, read-only. Keys are random and immutable, so responses are cached for a year.
export async function GET(_: Request, { params }: { params: { key: string } }) {
  if (!KEY_RE.test(params.key)) return new Response("Not found", { status: 404 });
  const data = await getStorage().get(params.key);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), { headers: {
    "Content-Type": CONTENT_TYPES[params.key.split(".").pop()!], "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox",
  } });
}
