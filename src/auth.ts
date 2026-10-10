import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { allowed } from "./lib/allowlist";
import { audit } from "./lib/audit";

// Google is the only provider (reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET). Stateless encrypted-JWT session cookie (HttpOnly), 24 h.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt", maxAge: 24 * 3600 },
  trustHost: true,
  pages: { signIn: "/admin/login", error: "/admin/login" },
  callbacks: {
    signIn: async ({ account, profile }) => {
      const ok = account?.provider === "google" && profile?.email_verified === true && allowed(profile.email);
      await audit(String(profile?.email ?? "unknown"), ok ? "signin.ok" : "signin.denied");
      return ok;
    },
    session: ({ session, token }) => Object.assign(session, { iat: token.iat }),
  },
});
