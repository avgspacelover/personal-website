import Link from "next/link";
import { ThemeToggle } from "@/components/Theme";
import { Radial } from "@/components/Radial";
import { collections } from "@/lib/content";
import { getLastUpdated, getVocations } from "@/lib/queries";
export const dynamic = "force-dynamic";
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [vocations, updated] = await Promise.all([getVocations(), getLastUpdated()]);
  const groups = {
    root: [{ label: "Work", group: "work" }, { label: "Library", group: "library" }, { label: "Resume", href: "/resume" }, { label: "More", group: "more" }],
    work: vocations.map((v) => ({ label: v.name, href: `/${v.slug}` })),
    library: collections.map((c) => ({ label: c.name, href: `/${c.slug}` })),
    more: [{ label: "About", href: "/about" }, { label: "Search", href: "/search" }],
  };
  return (<>
    <header className="top"><div className="wrap">
      <Link href="/" className="brand">Personal Archive</Link>
      <ThemeToggle />
      <nav className="main" aria-label="Primary">
        <div><span className="mono">WORK</span><ul>{vocations.map((v) => <li key={v.slug}><Link href={`/${v.slug}`}>{v.name}</Link></li>)}</ul></div>
        <div><span className="mono">LIBRARY</span><ul>{collections.map((c) => <li key={c.slug}><Link href={`/${c.slug}`}>{c.name}</Link></li>)}</ul></div>
        <div><span className="mono">SITE</span><ul><li><Link href="/resume">Resume</Link></li><li><Link href="/about">About</Link></li><li><Link href="/search">Search</Link></li></ul></div>
      </nav>
    </div></header>
    <main className="wrap">{children}</main>
    <footer><div className="wrap mono">{updated ? `UPDATED / ${updated.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase()}` : "PERSONAL ARCHIVE"}</div></footer>
    <Radial groups={groups} />
  </>);
}
