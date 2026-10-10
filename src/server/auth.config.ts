import type { NextAuthConfig } from "next-auth";

/** Provider-free config shared by the proxy (route protection) and the full auth setup. */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: "CUSTOMER" | "ADMIN" }).role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as "CUSTOMER" | "ADMIN";
      return session;
    },
  },
} satisfies NextAuthConfig;
