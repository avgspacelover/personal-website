import { desc } from "drizzle-orm";
import { getDb, mediaAsset } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { variantKeys } from "@/lib/media";
import { mediaUrl } from "@/lib/storage";
import { deleteMedia, updateAlt } from "./actions";
const msg: Record<string, string> = { size: "File exceeds 5 MB.", type: "Only JPEG, PNG and WebP images are accepted.", file: "Choose a file.", failed: "Upload failed.", confirm: "Tick the confirmation box to delete.", inuse: "This image is used in a record body. Remove it there first." };
export default async function Media(props: { searchParams: Promise<{ error?: string }> }) { const searchParams = await props.searchParams;
  await requireAdmin();
  const rows = await (await getDb()).select().from(mediaAsset).orderBy(desc(mediaAsset.createdAt));
  return (<>
    <h1>Media</h1>
    <p className="lede">JPEG, PNG or WebP, up to 5 MB. Metadata (including location) is stripped and responsive WebP sizes are generated.</p>
    <form action="/api/admin/media" method="post" encType="multipart/form-data" className="login edit">
      {searchParams.error && <p role="alert" className="err">{msg[searchParams.error] ?? "Failed."}</p>}
      <label className="mono" htmlFor="file">FILE</label><input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required />
      <label className="mono" htmlFor="alt">ALT TEXT (DESCRIBE THE IMAGE; LEAVE BLANK IF PURELY DECORATIVE)</label><input id="alt" name="alt" />
      <button className="tbtn big">UPLOAD</button>
    </form>
    <section className="blk"><h2>Library</h2>
      <ul className="media">
        {rows.map((a) => { const thumb = a.variants.includes(480) ? variantKeys(a.key, [480])[0] : a.key; return (
          <li key={a.id}>
            <img src={mediaUrl(thumb)} alt={a.alt} loading="lazy" width={240} height={Math.round((240 * a.height) / a.width)} />
            <p className="mono">{a.width}×{a.height} / {Math.round(a.bytes / 1024)} KB{a.alt ? "" : " / MISSING ALT"}</p>
            <p className="mono" style={{ wordBreak: "break-all" }}>{mediaUrl(a.key)}</p>
            <form action={updateAlt} className="inline"><input type="hidden" name="id" value={a.id} /><input name="alt" defaultValue={a.alt} aria-label={`Alt text for ${a.name}`} /><button className="tbtn">SAVE ALT</button></form>
            <form action={deleteMedia} className="inline"><input type="hidden" name="id" value={a.id} /><label className="mono"><input type="checkbox" name="confirm" /> CONFIRM</label><button className="tbtn">DELETE</button></form>
          </li>); })}
        {!rows.length && <li className="mono">No media yet.</li>}
      </ul>
    </section>
  </>);
}
