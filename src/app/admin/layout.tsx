import Link from "next/link";
import { ThemeToggle } from "@/components/Theme";
import { signOut } from "@/auth";
import { getAdmin } from "@/lib/auth";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authed = await getAdmin();
  return (<>
    <header className="top"><div className="wrap">
      <Link href="/admin" className="brand">Admin</Link>
      <span className="bar">
        {authed && <><Link href="/admin/vocations" className="mono">VOCATIONS</Link><Link href="/admin/entries" className="mono">RECORDS</Link><Link href="/admin/library" className="mono">LIBRARY</Link><Link href="/admin/search" className="mono">SEARCH</Link><a href="/api/admin/export" className="mono" download>EXPORT</a><Link href="/admin/media" className="mono">MEDIA</Link></>}
        <Link href="/" className="mono">VIEW SITE</Link>
        {authed && <form action={async () => { "use server"; await signOut({ redirectTo: "/admin/login" }); }}><button className="tbtn">SIGN OUT</button></form>}
        <ThemeToggle />
      </span>
    </div></header>
    <main className="wrap">{children}</main>
  </>);
}
