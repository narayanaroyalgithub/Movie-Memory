import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe config (no Prisma import) so middleware can use it.
 * Google credentials are read from AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET.
 */
export const authConfig = {
  providers: [Google],
  pages: { signIn: "/", error: "/" },
  callbacks: {
    // Only accept Google accounts whose email Google has verified
    // (prevents account takeover via unverified-email linking).
    signIn({ account, profile }) {
      if (account?.provider === "google") return profile?.email_verified === true;
      return false;
    },
    // Optimistic route protection used by middleware. Real checks live in lib/dal.ts.
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
