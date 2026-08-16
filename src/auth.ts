import NextAuth from "next-auth";
import Cognito from "next-auth/providers/cognito";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import {
  authenticateWithPassword,
  emailAuthConfigured,
} from "@/modules/identity/cognito-server";

const authConfigured = Boolean(
  process.env.AUTH_COGNITO_ID &&
  process.env.AUTH_COGNITO_SECRET &&
  process.env.AUTH_COGNITO_ISSUER &&
  process.env.AUTH_SECRET,
);

export { authConfigured };

export const { auth, handlers, signIn, signOut } = NextAuth({
  trustHost: true,
  secret:
    process.env.AUTH_SECRET || "build-only-placeholder-not-for-production",
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  providers: authConfigured
    ? [
        Credentials({
          credentials: {
            email: { label: "Email", type: "email" },
            password: { label: "Password", type: "password" },
          },
          authorize: async (credentials) => {
            if (!emailAuthConfigured) return null;
            const parsed = z
              .object({
                email: z.string().email(),
                password: z.string().min(8),
              })
              .safeParse(credentials);
            if (!parsed.success) return null;
            try {
              return await authenticateWithPassword(
                parsed.data.email.toLowerCase(),
                parsed.data.password,
              );
            } catch {
              return null;
            }
          },
        }),
        Cognito({
          clientId: process.env.AUTH_COGNITO_ID!,
          clientSecret: process.env.AUTH_COGNITO_SECRET!,
          issuer: process.env.AUTH_COGNITO_ISSUER!,
          authorization: {
            params: {
              response_type: "code",
              scope: "openid email profile",
            },
          },
        }),
      ]
    : [],
  callbacks: {
    authorized: ({ auth: session }) => Boolean(session?.user),
    jwt: ({ token, profile, user }) => {
      if (profile?.sub) token.sub = profile.sub;
      if (user) {
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }
      if (profile) {
        if (typeof profile.name === "string") token.name = profile.name;
        if (typeof profile.email === "string") token.email = profile.email;
        if (typeof profile.picture === "string")
          token.picture = profile.picture;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        if (token.sub) session.user.id = token.sub;
        if (typeof token.name === "string") session.user.name = token.name;
        if (typeof token.email === "string") session.user.email = token.email;
        if (typeof token.picture === "string")
          session.user.image = token.picture;
      }
      return session;
    },
  },
});
