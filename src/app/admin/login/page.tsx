import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
export const metadata = { title: "Sign in" };
const msg: Record<string, string> = {
  "1": "Incorrect password.", rate: "Too many attempts. Try again in 15 minutes.",
  config: "Sign-in is disabled: set ADMIN_PASSWORD_HASH (see README).",
};
export default async function Login({ searchParams }: { searchParams: { error?: string } }) {
  if (await getAdmin()) redirect("/admin");
  return (<>
    <h1>Sign in</h1>
    <form action="/api/admin/login" method="post" className="login">
      <label htmlFor="pw" className="mono">PASSWORD</label>
      <input id="pw" name="password" type="password" autoComplete="current-password" required autoFocus />
      {searchParams.error && <p role="alert" className="err">{msg[searchParams.error] ?? "Sign-in failed."}</p>}
      <button className="tbtn big">SIGN IN</button>
    </form>
  </>);
}
