import { NextRequest, NextResponse } from "next/server";
import { getGmail, mailErrorResponse } from "@/lib/gmail/client";
import { getSyncDelta } from "@/lib/gmail/sync";

/**
 * GET /api/mail/sync?historyId=<cursor>
 *
 * The realtime baseline: the client calls this on a 15s interval. Returns
 * which message ids changed since the cursor, plus the new cursor. A push
 * pipeline could call the same endpoint on demand for near-instant sync.
 */
export async function GET(req: NextRequest) {
  try {
    const gmail = await getGmail();
    const historyId = req.nextUrl.searchParams.get("historyId") ?? undefined;
    return NextResponse.json(await getSyncDelta(gmail, historyId));
  } catch (error) {
    return mailErrorResponse(error);
  }
}
