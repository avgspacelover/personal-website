"use server";
import { redirect } from "next/navigation";
import { getDb, siteSettings } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { parseBody } from "@/lib/richtext";
const str = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);

export async function saveSettings(fd: FormData) {
  await requireAdmin("saveSettings");
  const email = str(fd, "contactEmail", 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/admin/settings?error=email");
  const currently = parseBody(String(fd.get("currently") ?? "")), aboutBody = parseBody(String(fd.get("aboutBody") ?? ""));
  if (!currently || !aboutBody) redirect("/admin/settings?error=body");
  const links: { label: string; url: string }[] = [];
  for (const line of str(fd, "links", 2000).split("\n")) {
    const [label, ...rest] = line.split("|"), url = rest.join("|").trim();
    if (label?.trim() && /^(https?:\/\/|mailto:)/i.test(url) && url.length <= 500 && links.length < 10) links.push({ label: label.trim().slice(0, 40), url });
  }
  const v = { milestonesTitle: str(fd, "milestonesTitle", 40), milestonesIntro: str(fd, "milestonesIntro", 300), siteName: str(fd, "siteName", 100), tagline: str(fd, "tagline", 200), intro: str(fd, "intro", 400), metaDescription: str(fd, "metaDescription", 300), contactEmail: email, links, currently, aboutBody };
  await (await getDb()).insert(siteSettings).values({ id: "main", ...v }).onConflictDoUpdate({ target: siteSettings.id, set: v });
  redirect("/admin/settings?saved=1");
}
