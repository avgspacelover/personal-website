/* eslint-disable @typescript-eslint/no-explicit-any */
// Body format: Tiptap/ProseMirror JSON, whitelisted. Legacy bodies (string[] of paragraphs) are converted on read.
export type N = { type: string; content?: N[]; text?: string; marks?: { type: string; attrs?: any }[]; attrs?: any };
export type Doc = { type: "doc"; content: N[] };
const NODES = new Set(["paragraph", "heading", "bulletList", "orderedList", "listItem", "blockquote", "codeBlock", "horizontalRule", "hardBreak", "image", "text"]);
const MARKS = new Set(["bold", "italic", "code", "strike", "link"]);
const KEY = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpg|png|webp)$/;
export const mediaKeyFromSrc = (src: unknown) => { const m = typeof src === "string" ? KEY.exec(src) : null; return m ? `${m[1]}.${m[2]}` : null; };

export function sanitizeDoc(input: unknown): Doc {
  let count = 0;
  const clean = (n: any, depth: number): N | null => {
    if (!n || typeof n !== "object" || depth > 12 || ++count > 5000 || !NODES.has(n.type)) return null;
    const out: N = { type: n.type };
    if (n.type === "text") {
      if (typeof n.text !== "string" || !n.text) return null;
      out.text = n.text.slice(0, 20000);
      const marks = (Array.isArray(n.marks) ? n.marks : []).flatMap((m: any) => {
        if (!m || !MARKS.has(m.type)) return [];
        if (m.type !== "link") return [{ type: m.type }];
        const href = String(m.attrs?.href ?? "");
        return /^(https?:\/\/|mailto:|\/(?!\/))/i.test(href) && href.length < 2000 ? [{ type: "link", attrs: { href } }] : [];
      });
      if (marks.length) out.marks = marks;
      return out;
    }
    if (n.type === "heading") out.attrs = { level: n.attrs?.level === 3 ? 3 : 2 };
    if (n.type === "image") {
      const key = mediaKeyFromSrc(n.attrs?.src);
      if (!key) return null;
      out.attrs = { src: `/media/${key}`, alt: String(n.attrs?.alt ?? "").slice(0, 500) };
    }
    if (Array.isArray(n.content)) { const c = n.content.map((x: any) => clean(x, depth + 1)).filter(Boolean) as N[]; if (c.length) out.content = c; }
    return out;
  };
  const raw = input && typeof input === "object" ? (input as any).content : null;
  return { type: "doc", content: (Array.isArray(raw) ? raw : []).map((n: any) => clean(n, 0)).filter(Boolean) as N[] };
}
export function toDoc(body: unknown): Doc {
  if (Array.isArray(body)) return { type: "doc", content: body.filter((s) => typeof s === "string" && s.trim()).map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })) };
  return sanitizeDoc(body);
}
export function mediaKeysIn(n: N | Doc): string[] {
  const here = n.type === "image" ? [mediaKeyFromSrc((n as N).attrs?.src)].filter(Boolean) as string[] : [];
  return here.concat(((n as N).content ?? []).flatMap(mediaKeysIn));
}
export function parseBody(raw: string): Doc | null { if (raw.length > 500_000) return null; try { return sanitizeDoc(JSON.parse(raw || "null")); } catch { return null; } }
export const docText = (n: N | Doc): string => ((n as N).text ?? "") + " " + ((n as N).content ?? []).map(docText).join(" ");
