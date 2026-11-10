import type { Metadata } from "next";
import { headers } from "next/headers";
import { site } from "@/lib/content";
import { getSettings } from "@/lib/queries";
import "@fontsource/hanken-grotesk/400.css";
import "@fontsource/hanken-grotesk/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(site.url),
    alternates: { types: { "application/rss+xml": "/feed.xml" } },
    title: { default: s.siteName, template: `%s / ${s.siteName}` },
    description: s.metaDescription,
    openGraph: { type: "website", siteName: s.siteName, title: s.siteName, description: s.metaDescription },
    twitter: { card: "summary", title: s.siteName, description: s.metaDescription },
  };
}
const themeInit = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
export default async function Root({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined; // set by proxy.ts; inline scripts must carry it
  const s = await getSettings();
  const website = { "@context": "https://schema.org", "@type": "WebSite", "@id": `${site.url}/#website`, url: site.url, name: s.siteName, description: s.intro };
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeInit }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website).replace(/</g, "\\u003c") }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
