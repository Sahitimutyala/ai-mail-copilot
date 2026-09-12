import { NextRequest, NextResponse } from "next/server";
import { getGmail, mailErrorResponse } from "@/lib/gmail/client";
import { getMessageDetail, setRead } from "@/lib/gmail/messages";

/** GET /api/mail/messages/:id — full sanitized detail */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const gmail = await getGmail();
    return NextResponse.json(await getMessageDetail(gmail, id));
  } catch (error) {
    return mailErrorResponse(error);
  }
}

/** PATCH /api/mail/messages/:id — body { read: boolean } */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { read } = (await req.json()) as { read: boolean };
    const gmail = await getGmail();
    await setRead(gmail, id, read);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return mailErrorResponse(error);
  }
}
