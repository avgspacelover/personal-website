import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb, vocation } from "@/db";
import { EntryView } from "@/components/EntryView";
import { requireAdmin } from "@/lib/auth";
import { getEntryAnyStatus } from "@/lib/queries";
import { UUID } from "@/lib/slug";
export const metadata = { title: "Preview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
// Admin-only. Same component and layout as the public page, for ANY status, showing the last saved version.
export default async function Preview(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  await requireAdmin();
  if (!UUID.test(id)) notFound();
  const r = await getEntryAnyStatus(id);
  if (!r) notFound();
  const names = new Map((await (await getDb()).select({ slug: vocation.slug, name: vocation.name }).from(vocation)).map((v) => [v.slug, v.name]));
  return (<>
    <p role="status" className="err" style={{ marginTop: "1.5rem" }}>PREVIEW / {r.publishStatus.toUpperCase()}. Only you can see this, and it shows the last <strong>saved</strong> version. <Link href={`/admin/entries/${id}`}>Back to editor</Link></p>
    <EntryView e={r.entry} names={names} />
  </>);
}
