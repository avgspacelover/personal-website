import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { allowed } from "./lib/allowlist";

// Google is the only provider (reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET). Stateless encrypted-JWT session cookie (HttpOnly).
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt", maxAge: 3 * 24 * 3600 },
  trustHost: true,
  pages: { signIn: "/admin/login", error: "/admin/login" },
  callbacks: {
    signIn: ({ account, profile }) => account?.provider === "google" && profile?.email_verified === true && allowed(profile.email),
  },
});
