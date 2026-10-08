import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource/hanken-grotesk/400.css";
import "@fontsource/hanken-grotesk/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import { ThemeToggle } from "@/components/Theme";
import { Radial } from "@/components/Radial";
import { vocations, collections, site } from "@/lib/content";
import "./globals.css";
export const metadata: Metadata = { metadataBase: new URL(site.url), alternates: { types: { "application/rss+xml": "/feed.xml" } }, title: { default: "Personal Archive", template: "%s / Personal Archive" }, description: "Professional work by vocation, and a separate personal library." };
const themeInit = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
export default function Root({ children }: { children: React.ReactNode }) {
  const groups = {
    root: [{ label: "Work", group: "work" }, { label: "Library", group: "library" }, { label: "Resume", href: "/resume" }, { label: "About", href: "/about" }],
    work: vocations.map((v) => ({ label: v.name, href: `/${v.slug}` })),
    library: collections.map((c) => ({ label: c.name, href: `/${c.slug}` })),
  };
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInit }} /></head>
      <body>
        <header className="top"><div className="wrap">
          <Link href="/" className="brand">Personal Archive</Link>
          <nav className="main" aria-label="Primary"><ul>
            {vocations.map((v) => <li key={v.slug}><Link href={`/${v.slug}`}>{v.name}</Link></li>)}
            {collections.map((c) => <li key={c.slug}><Link href={`/${c.slug}`}>{c.name}</Link></li>)}
            <li><Link href="/resume">Resume</Link></li><li><Link href="/about">About</Link></li>
          </ul></nav>
          <ThemeToggle />
        </div></header>
        <main className="wrap">{children}</main>
        <footer><div className="wrap mono">UPDATED / OCT 2026</div></footer>
        <Radial groups={groups} />
      </body>
    </html>
  );
}
