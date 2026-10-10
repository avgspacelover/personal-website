import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { getDb, libraryItem, mediaAsset } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { COLLECTIONS, RECS } from "@/lib/library";
import { UUID } from "@/lib/slug";
import { deleteItem, saveItem } from "../../actions";
const msg: Record<string, string> = { title: "Title is required.", url: "URL must start with https://, http:// or mailto:.", image: "Choose an image from the media library.", confirm: "Tick the confirmation box to delete." };
export default async function Edit(props: { params: Promise<{ collection: string; id: string }>; searchParams: Promise<{ error?: string }> }) { const params = await props.params; const searchParams = await props.searchParams;
  await requireAdmin();
  const cfg = COLLECTIONS[params.collection];
  if (!cfg) notFound();
  const db = await getDb(), isNew = params.id === "new";
  const r = isNew || !UUID.test(params.id) ? null : (await db.select().from(libraryItem).where(and(eq(libraryItem.id, params.id), eq(libraryItem.collection, params.collection))).limit(1))[0];
  if (!isNew && !r) notFound();
  const media = cfg.image ? await db.select({ key: mediaAsset.key, name: mediaAsset.name, alt: mediaAsset.alt }).from(mediaAsset).orderBy(desc(mediaAsset.createdAt)) : [];
  const F = (id: string, label: string, el: React.ReactNode) => <><label className="mono" htmlFor={id}>{label}</label>{el}</>;
  return (<>
    <p className="mono" style={{ marginTop: "2rem" }}><Link href={`/admin/library/${params.collection}`}>{cfg.name.toUpperCase()}</Link> / {isNew ? "NEW" : "EDIT"}</p>
    <h1 style={{ marginTop: ".5rem" }}>{isNew ? `New ${cfg.one}` : r!.title}</h1>
    <form action={saveItem} className="login edit">
      <input type="hidden" name="id" value={r?.id ?? ""} /><input type="hidden" name="collection" value={params.collection} />
      {searchParams.error && <p role="alert" className="err">{msg[searchParams.error] ?? "Could not save."}</p>}
      {F("title", cfg.title, <input id="title" name="title" defaultValue={r?.title} required />)}
      {F("creator", cfg.creator, <input id="creator" name="creator" defaultValue={r?.creator} />)}
      {cfg.url && F("url", cfg.url, <input id="url" name="url" type="url" defaultValue={r?.url ?? ""} />)}
      {cfg.year && F("year", cfg.year, <input id="year" name="year" defaultValue={r?.year ?? ""} />)}
      {cfg.rating && F("rating", "RECOMMENDATION", <select id="rating" name="rating" defaultValue={r?.rating ?? ""}><option value="">Unrated</option>{RECS.map((x) => <option key={x}>{x}</option>)}</select>)}
      {cfg.image && F("image", cfg.image, <select id="image" name="image" defaultValue={r?.image ?? ""}><option value="">None</option>{media.map((m) => <option key={m.key} value={m.key}>{m.name || m.key}{m.alt ? "" : " (no alt text)"}</option>)}</select>)}
      {F("notes", cfg.notes, <textarea id="notes" name="notes" rows={5} defaultValue={r?.notes} />)}
      {F("tags", "TAGS (COMMA-SEPARATED)", <input id="tags" name="tags" defaultValue={r?.tags.join(", ")} />)}
      {F("position", "POSITION (LOWER FIRST)", <input id="position" name="position" type="number" defaultValue={r?.position ?? 0} />)}
      {F("status", "STATUS", <select id="status" name="status" defaultValue={r?.status ?? "draft"}><option value="draft">Draft (private)</option><option value="published">Published</option><option value="archived">Archived (private)</option></select>)}
      <button className="tbtn big">SAVE</button>
    </form>
    {r && <section className="blk"><h2>Delete</h2>
      <form action={deleteItem} className="login edit"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="collection" value={params.collection} />
        <label><input type="checkbox" name="confirm" style={{ minHeight: 0 }} /> I understand this cannot be undone</label><button className="tbtn big">DELETE</button></form></section>}
  </>);
}
