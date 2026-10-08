import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { getAdmin } from "@/lib/auth";
export const metadata = { title: "Sign in" };
const msg: Record<string, string> = {
  AccessDenied: "That Google account is not authorized for this site.",
  Configuration: "Sign-in is not configured.",
};
const REQUIRED = ["AUTH_SECRET", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "ADMIN_EMAILS"];
export default async function Login({ searchParams }: { searchParams: { error?: string } }) {
  if (await getAdmin()) redirect("/admin");
  const missing = REQUIRED.filter((k) => !process.env[k]);
  const dev = process.env.NODE_ENV !== "production";
  const error = missing.length ? (dev ? `Set ${missing.join(", ")} (see README).` : msg.Configuration) : searchParams.error ? (msg[searchParams.error] ?? "Sign-in failed. Try again.") : null;
  return (<>
    <h1>Sign in</h1>
    <form className="login" action={async () => { "use server"; await signIn("google", { redirectTo: "/admin" }); }}>
      {error && <p role="alert" className="err">{error}</p>}
      <button className="tbtn big" disabled={missing.length > 0}>SIGN IN WITH GOOGLE</button>
    </form>
  </>);
}
