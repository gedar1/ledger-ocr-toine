import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  // Self-hosted (not Vercel/Cloudflare Pages) deployments must opt in to
  // trusting the incoming Host header, otherwise Auth.js throws
  // UntrustedHost in production (`next start`) — see
  // node_modules/@auth/core/lib/utils/env.js: trustHost only defaults to
  // true when AUTH_URL/AUTH_TRUST_HOST/VERCEL/CF_PAGES are set, or outside
  // production. This app is self-hosted behind its own reverse proxy/host,
  // so trusting the Host header here is safe as long as that proxy strips
  // client-supplied Host/X-Forwarded-Host before forwarding.
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { clientProfile: true },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password,
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          locale: user.locale,
          clientStatus: user.clientProfile?.status ?? null,
          clientProfileId: user.clientProfile?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.locale = user.locale;
        token.clientStatus = user.clientStatus;
        token.clientProfileId = user.clientProfileId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.locale = token.locale;
        session.user.clientStatus = token.clientStatus;
        session.user.clientProfileId = token.clientProfileId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
