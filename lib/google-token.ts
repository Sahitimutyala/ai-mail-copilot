import "server-only";

/**
 * Server-side Google access-token freshness, shared by the Auth.js jwt
 * callback and the Gmail client.
 *
 * Why: with JWT sessions, a token refreshed during a server-component
 * render can't always be written back into the cookie, so without a cache
 * every request after the first hour would re-run the OAuth refresh grant.
 * A module-level cache (per serverless instance) keyed by refresh token
 * makes the refresh happen once per expiry window, with in-flight
 * deduplication so concurrent requests share one refresh.
 */

export interface FreshToken {
  accessToken: string;
  /** Unix seconds */
  expiresAt: number;
}

interface TokenBundle {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

const cache = new Map<string, FreshToken>();
const inFlight = new Map<string, Promise<FreshToken | null>>();

const SKEW_SECONDS = 60;

export async function freshAccessToken(
  bundle: TokenBundle
): Promise<FreshToken | null> {
  const now = Math.floor(Date.now() / 1000);

  if (
    bundle.accessToken &&
    bundle.expiresAt &&
    bundle.expiresAt - SKEW_SECONDS > now
  ) {
    return { accessToken: bundle.accessToken, expiresAt: bundle.expiresAt };
  }

  const refreshToken = bundle.refreshToken;
  if (!refreshToken) return null;

  const cached = cache.get(refreshToken);
  if (cached && cached.expiresAt - SKEW_SECONDS > now) return cached;

  const pending = inFlight.get(refreshToken);
  if (pending) return pending;

  const refresh = (async (): Promise<FreshToken | null> => {
    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: new URLSearchParams({
          client_id: process.env.AUTH_GOOGLE_ID!,
          client_secret: process.env.AUTH_GOOGLE_SECRET!,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });
      const data = (await response.json()) as {
        access_token?: string;
        expires_in?: number;
      };
      if (!response.ok || !data.access_token) return null;

      const fresh: FreshToken = {
        accessToken: data.access_token,
        expiresAt: Math.floor(Date.now() / 1000 + (data.expires_in ?? 3600)),
      };
      cache.set(refreshToken, fresh);
      return fresh;
    } catch {
      return null;
    } finally {
      inFlight.delete(refreshToken);
    }
  })();

  inFlight.set(refreshToken, refresh);
  return refresh;
}
