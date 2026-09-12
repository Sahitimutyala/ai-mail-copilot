import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
// Imported for the module augmentation below — TS can only extend a module it has seen.
import type { JWT as _JWT } from "next-auth/jwt";
import { freshAccessToken } from "@/lib/google-token";

/**
 * Auth.js v5 configuration.
 *
 * The app authenticates with "Sign in with Google" (OAuth). Google returns:
 *  - an access token (valid ~1h) used to call the Gmail API
 *  - a refresh token used to mint new access tokens silently
 * Both live ONLY inside the encrypted JWT session cookie — the session
 * callback deliberately never copies them onto the Session object, because
 * everything returned there is served to browser JavaScript via
 * GET /api/auth/session. Server code reads the JWT directly
 * (see lib/gmail/client.ts).
 *
 * Scopes: gmail.modify covers reading, searching (q=), and marking
 * read/unread; gmail.send covers sending. Requested up-front on first
 * login (access_type=offline + prompt=consent guarantees a refresh token).
 */
const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

declare module "next-auth" {
  interface Session {
    error?: "RefreshTokenError";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    /** Unix seconds when the access token expires */
    expiresAt?: number;
    error?: "RefreshTokenError";
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: SCOPES,
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // First sign-in: persist the tokens Google just issued.
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        };
      }

      // Reuses the current token while valid; refreshes (with caching +
      // in-flight dedup) when expired. Null means the refresh grant failed —
      // non-retryable (revoked / 7-day testing expiry) → force re-login.
      const fresh = await freshAccessToken(token);
      if (!fresh) {
        return { ...token, error: "RefreshTokenError" as const };
      }
      return {
        ...token,
        accessToken: fresh.accessToken,
        expiresAt: fresh.expiresAt,
        error: undefined,
      };
    },
    async session({ session, token }) {
      // Only the error flag crosses to the client — never tokens.
      session.error = token.error;
      return session;
    },
  },
});
