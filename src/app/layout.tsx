import type { Metadata } from "next";
import { headers } from "next/headers";
import { site } from "@/lib/content";
import "@fontsource/hanken-grotesk/400.css";
import "@fontsource/hanken-grotesk/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";
export const metadata: Metadata = { metadataBase: new URL(site.url), alternates: { types: { "application/rss+xml": "/feed.xml" } }, title: { default: "Personal Archive", template: "%s / Personal Archive" }, description: "Professional work by vocation, and a separate personal library." };
const themeInit = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
export default async function Root({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined; // set by proxy.ts; inline scripts must carry it
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeInit }} /></head>
      <body>{children}</body>
    </html>
  );
}
