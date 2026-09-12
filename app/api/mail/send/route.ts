import { NextRequest, NextResponse } from "next/server";
import { getGmail, mailErrorResponse } from "@/lib/gmail/client";
import { buildMime, toRaw } from "@/lib/gmail/mime";

interface SendBody {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  /** Present when replying — threads the message in Gmail */
  threadId?: string;
  inReplyTo?: string;
  references?: string;
}

/** POST /api/mail/send */
export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as SendBody;
    if (!payload.to?.trim()) {
      return NextResponse.json(
        { error: "Recipient (To) is required." },
        { status: 400 }
      );
    }

    const gmail = await getGmail();
    const raw = toRaw(
      buildMime({
        to: payload.to,
        cc: payload.cc || undefined,
        subject: payload.subject ?? "",
        body: payload.body ?? "",
        inReplyTo: payload.inReplyTo,
        references: payload.references,
      })
    );

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw, threadId: payload.threadId },
    });

    return NextResponse.json({ id: res.data.id, threadId: res.data.threadId });
  } catch (error) {
    return mailErrorResponse(error);
  }
}
