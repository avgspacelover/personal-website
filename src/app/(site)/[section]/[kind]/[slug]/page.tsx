import { notFound, permanentRedirect } from "next/navigation";
import { EntryView } from "@/components/EntryView";
import { entryHref } from "@/lib/content";
import { getEntry, getVocations } from "@/lib/queries";
import { redirectFor } from "@/lib/redirects";
import { mediaKeysIn, toDoc } from "@/lib/richtext";
import { mediaUrl } from "@/lib/storage";
type P = { params: Promise<{ section: string; kind: string; slug: string }> };
export const dynamic = "force-dynamic";
// Canonical route only: /<primary-vocation>/<kind>/<slug>. Other vocation pages link here.
export async function generateMetadata(props: P) { const params = await props.params;
  const e = await getEntry(params.kind, params.slug);
  if (!e) return {};
  const path = e.canonical || entryHref(e), title = e.seoTitle || e.title, description = e.seoDescription || e.summary;
  const img = e.seoImage || mediaKeysIn(toDoc(e.body))[0]; // explicit social image first, else the first image in the body
  return { title, description, alternates: { canonical: path }, openGraph: { type: "article" as const, title, description, url: path, images: img ? [mediaUrl(img)] : undefined } };
}
export default async function Detail(props: P) { const params = await props.params;
  const e = await getEntry(params.kind, params.slug);
  const path = `/${params.section}/${params.kind}/${params.slug}`;
  if (!e) { const to = await redirectFor(path); if (to) permanentRedirect(to); notFound(); }
  if (entryHref(e) !== path) permanentRedirect(entryHref(e)); // same record reached via a non-primary vocation
  const names = new Map((await getVocations()).map((v) => [v.slug, v.name]));
  return <EntryView e={e} names={names} canonical={e.canonical || path} />;
}
