import React from "react";
import { inArray } from "drizzle-orm";
import { getDb, mediaAsset } from "@/db";
import { mediaKeysIn, toDoc, type N } from "@/lib/richtext";
import { mediaUrl, variantKeys } from "@/lib/storage";
type Asset = typeof mediaAsset.$inferSelect;

function text(n: N, key: number) {
  let el: React.ReactNode = n.text;
  for (const m of n.marks ?? []) {
    if (m.type === "bold") el = <strong>{el}</strong>;
    else if (m.type === "italic") el = <em>{el}</em>;
    else if (m.type === "code") el = <code>{el}</code>;
    else if (m.type === "strike") el = <s>{el}</s>;
    else if (m.type === "link") el = <a href={m.attrs.href} rel="noopener noreferrer">{el}</a>;
  }
  return <React.Fragment key={key}>{el}</React.Fragment>;
}
function node(n: N, i: number, assets: Map<string, Asset>): React.ReactNode {
  const kids = () => n.content?.map((c, j) => node(c, j, assets));
  switch (n.type) {
    case "text": return text(n, i);
    case "paragraph": return <p key={i}>{kids()}</p>;
    case "heading": return n.attrs?.level === 3 ? <h3 key={i}>{kids()}</h3> : <h2 key={i}>{kids()}</h2>;
    case "bulletList": return <ul key={i}>{kids()}</ul>;
    case "orderedList": return <ol key={i}>{kids()}</ol>;
    case "listItem": return <li key={i}>{kids()}</li>;
    case "blockquote": return <blockquote key={i}>{kids()}</blockquote>;
    case "codeBlock": return <pre key={i}><code>{n.content?.map((c) => c.text).join("")}</code></pre>;
    case "horizontalRule": return <hr key={i} />;
    case "hardBreak": return <br key={i} />;
    case "image": {
      const key = n.attrs.src.slice("/media/".length), a = assets.get(key);
      if (!a) return null;
      const srcSet = a.variants.length ? [...a.variants.map((w) => `${mediaUrl(variantKeys(key, [w])[0])} ${w}w`), `${mediaUrl(key)} ${a.width}w`].join(", ") : undefined;
      // Alt comes from the media library so fixing it there updates every page.
      return <figure key={i}><img src={mediaUrl(key)} srcSet={srcSet} sizes="(max-width: 720px) 100vw, 40rem" alt={a.alt} width={a.width} height={a.height} loading="lazy" /></figure>;
    }
    default: return null;
  }
}
export async function RichText({ body }: { body: unknown }) {
  const doc = toDoc(body);
  const keys = [...new Set(mediaKeysIn(doc))];
  const rows = keys.length ? await (await getDb()).select().from(mediaAsset).where(inArray(mediaAsset.key, keys)) : [];
  const assets = new Map(rows.map((a) => [a.key, a]));
  return <>{doc.content.map((n, i) => node(n, i, assets))}</>;
}
