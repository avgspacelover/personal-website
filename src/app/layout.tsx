import type { Metadata } from "next";
import { headers } from "next/headers";
import { site } from "@/lib/content";
import { getSettings } from "@/lib/queries";
import { rootMetadata, serializeJsonLd, websiteJsonLd } from "@/lib/seo";
import "@fontsource/hanken-grotesk/400.css";
import "@fontsource/hanken-grotesk/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return rootMetadata(s, site.url);
}
const themeInit = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
export default async function Root({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined; // set by proxy.ts; inline scripts must carry it
  const s = await getSettings();
  const website = websiteJsonLd(s, site.url);
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeInit }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(website) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
