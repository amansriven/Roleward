import NextAuth from "next-auth";
import Cognito from "next-auth/providers/cognito";

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
    jwt: ({ token, profile }) => {
      if (profile?.sub) token.sub = profile.sub;
      return token;
    },
    session: ({ session, token }) => {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
