import { NextRequest, NextResponse } from "next/server";
import { getGmail, mailErrorResponse } from "@/lib/gmail/client";
import { listMessages } from "@/lib/gmail/messages";

/** GET /api/mail/messages?folder=inbox|sent&q=<gmail query>&pageToken= */
export async function GET(req: NextRequest) {
  try {
    const gmail = await getGmail();
    const sp = req.nextUrl.searchParams;
    const data = await listMessages(gmail, {
      folder: sp.get("folder") === "sent" ? "sent" : "inbox",
      q: sp.get("q") ?? undefined,
      pageToken: sp.get("pageToken") ?? undefined,
    });
    return NextResponse.json(data);
  } catch (error) {
    return mailErrorResponse(error);
  }
}
