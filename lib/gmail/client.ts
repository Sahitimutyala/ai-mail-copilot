import "server-only";
import { google, type gmail_v1 } from "googleapis";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getToken, type JWT } from "next-auth/jwt";
import { freshAccessToken } from "@/lib/google-token";

export class GmailAuthError extends Error {
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "GmailAuthError";
  }
}

/**
 * Builds a Gmail client for the signed-in user's current request.
 *
 * Reads the encrypted session JWT straight from the request cookie
 * (the access token is intentionally NOT on the client-visible session —
 * see auth.ts) and ensures it is fresh via the shared refresh cache.
 */
export async function getGmail(): Promise<gmail_v1.Gmail> {
  const requestHeaders = await headers();
  const secure = (requestHeaders.get("x-forwarded-proto") ?? "").includes(
    "https"
  );
  const jwt = (await getToken({
    req: { headers: requestHeaders },
    secret: process.env.AUTH_SECRET!,
    secureCookie: secure,
  })) as JWT | null;

  if (!jwt) throw new GmailAuthError();

  const fresh = await freshAccessToken(jwt);
  if (!fresh) throw new GmailAuthError("Google session expired");

  const oauth2 = new google.auth.OAuth2();
  oauth2.setCredentials({ access_token: fresh.accessToken });
  return google.gmail({ version: "v1", auth: oauth2 });
}

/** Maps service-layer failures to HTTP responses for the API routes. */
export function mailErrorResponse(error: unknown): NextResponse {
  if (error instanceof GmailAuthError) {
    return NextResponse.json(
      { error: "Session expired — please sign in again." },
      { status: 401 }
    );
  }
  const apiError = error as { code?: number; message?: string };
  const status =
    typeof apiError.code === "number" && apiError.code >= 400
      ? apiError.code
      : 500;
  console.error("[mail] Gmail API error:", apiError.message ?? error);
  return NextResponse.json(
    { error: apiError.message ?? "Mail service error" },
    { status }
  );
}
