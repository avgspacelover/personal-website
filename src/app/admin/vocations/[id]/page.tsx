import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, vocation } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { UUID } from "@/lib/slug";
import { deleteVocation, saveVocation } from "../actions";
const msg: Record<string, string> = {
  name: "Name is required.", invalid: "Slug may contain only lowercase letters, numbers and single hyphens.",
  reserved: "That slug is reserved by a fixed route or a library collection.", taken: "Another vocation already uses that slug.",
  confirm: "Tick the confirmation box to delete.",
};
export default async function EditVocation(props: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) { const params = await props.params; const searchParams = await props.searchParams;
  await requireAdmin();
  const isNew = params.id === "new";
  const v = isNew || !UUID.test(params.id) ? null : (await (await getDb()).select().from(vocation).where(eq(vocation.id, params.id)).limit(1))[0];
  if (!isNew && !v) notFound();
  return (<>
    <p className="mono" style={{ marginTop: "2rem" }}><Link href="/admin/vocations">VOCATIONS</Link> / {isNew ? "NEW" : v!.slug.toUpperCase()}</p>
    <h1 style={{ marginTop: ".5rem" }}>{isNew ? "New vocation" : v!.name}</h1>
    <form action={saveVocation} className="login edit">
      <input type="hidden" name="id" value={v?.id ?? ""} />
      {searchParams.error && <p role="alert" className="err">{msg[searchParams.error] ?? "Could not save."}</p>}
      <label className="mono" htmlFor="name">NAME</label><input id="name" name="name" defaultValue={v?.name} required />
      <label className="mono" htmlFor="slug">SLUG (BLANK = FROM NAME)</label><input id="slug" name="slug" defaultValue={v?.slug} />
      <label className="mono" htmlFor="intro">INTRO</label><textarea id="intro" name="intro" rows={4} defaultValue={v?.intro} />
      <label className="mono" htmlFor="position">POSITION</label><input id="position" name="position" type="number" defaultValue={v?.position ?? 0} />
      <label className="mono" htmlFor="status">STATUS</label>
      <select id="status" name="status" defaultValue={v?.status ?? "draft"}><option value="draft">Draft (private)</option><option value="published">Published</option><option value="archived">Archived (private)</option></select>
      <button className="tbtn big">SAVE</button>
    </form>
    {v && <section className="blk"><h2>Delete</h2>
      <form action={deleteVocation} className="login edit">
        <input type="hidden" name="id" value={v.id} />
        <p className="mono" style={{ margin: 0 }}>Removes the vocation and its links. Projects and experience are kept but stay hidden until linked to a published vocation.</p>
        <label><input type="checkbox" name="confirm" style={{ minHeight: 0 }} /> I understand</label>
        <button className="tbtn big">DELETE VOCATION</button>
      </form></section>}
  </>);
}
