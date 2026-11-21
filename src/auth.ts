import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

// Only free/busy access: Samen can see WHEN you're busy, never WHAT you're doing.
export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.freebusy";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  providers: [
    Google({
      authorization: {
        params: {
          scope: `openid email profile ${CALENDAR_SCOPE}`,
          access_type: "offline", // gives us a refresh token
          prompt: "consent",
        },
      },
    }),
  ],
  events: {
    // The adapter only stores tokens on the very first sign-in.
    // Keep them fresh on every later sign-in too.
    async signIn({ account }) {
      if (!account || account.provider !== "google") return;
      await db.account.updateMany({
        where: { provider: "google", providerAccountId: account.providerAccountId },
        data: {
          access_token: account.access_token,
          expires_at: account.expires_at,
          scope: account.scope,
          id_token: account.id_token,
          ...(account.refresh_token ? { refresh_token: account.refresh_token } : {}),
        },
      });
    },
  },
});
