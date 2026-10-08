import Link from "next/link";
import { ThemeToggle } from "@/components/Theme";
import { getAdmin } from "@/lib/auth";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authed = await getAdmin();
  return (<>
    <header className="top"><div className="wrap">
      <Link href="/admin" className="brand">Admin</Link>
      <span className="bar">
        <Link href="/" className="mono">VIEW SITE</Link>
        {authed && <form action="/api/admin/logout" method="post"><button className="tbtn">SIGN OUT</button></form>}
        <ThemeToggle />
      </span>
    </div></header>
    <main className="wrap">{children}</main>
  </>);
}
