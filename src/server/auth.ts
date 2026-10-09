import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { authorizeCredentials } from "./auth-credentials";

export { authorizeCredentials };

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        if (typeof creds?.email !== "string" || typeof creds?.password !== "string") return null;
        return authorizeCredentials(creds.email, creds.password);
      },
    }),
  ],
});
