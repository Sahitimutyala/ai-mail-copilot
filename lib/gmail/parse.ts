import type { gmail_v1 } from "googleapis";
import type { EmailAddress, EmailSummary } from "@/lib/types";

/** Pure parsing helpers for Gmail API payloads. No I/O — fully unit-testable. */

export function headerValue(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string {
  const header = headers?.find(
    (h) => h.name?.toLowerCase() === name.toLowerCase()
  );
  return header?.value ?? "";
}

/** "Sarah Chen <sarah@x.com>" → { name: "Sarah Chen", email: "sarah@x.com" } */
export function parseAddress(raw: string): EmailAddress {
  const match = raw.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  const email = raw.trim();
  return { name: "", email };
}

export function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

/**
 * Walks the (possibly nested) MIME tree and returns the first text/html
 * and text/plain bodies found. Gmail nests multipart/alternative inside
 * multipart/mixed for messages with attachments — recursion handles both.
 */
export function extractBody(
  payload: gmail_v1.Schema$MessagePart | undefined | null
): { html: string | null; text: string | null } {
  let html: string | null = null;
  let text: string | null = null;

  const visit = (part: gmail_v1.Schema$MessagePart | undefined | null) => {
    if (!part || (html && text)) return;
    const data = part.body?.data;
    if (data) {
      if (part.mimeType === "text/html" && html === null) {
        html = decodeBase64Url(data);
      } else if (part.mimeType === "text/plain" && text === null) {
        text = decodeBase64Url(data);
      }
    }
    for (const child of part.parts ?? []) visit(child);
  };

  visit(payload);
  return { html, text };
}

/** Gmail snippets arrive with HTML entities baked in ("Let&#39;s meet"). */
export function decodeEntities(input: string): string {
  return input
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&nbsp;", " ");
}

export function toEmailSummary(msg: gmail_v1.Schema$Message): EmailSummary {
  const headers = msg.payload?.headers;
  return {
    id: msg.id ?? "",
    threadId: msg.threadId ?? "",
    from: parseAddress(headerValue(headers, "From")),
    to: headerValue(headers, "To"),
    subject: headerValue(headers, "Subject") || "(no subject)",
    snippet: decodeEntities(msg.snippet ?? ""),
    // internalDate (epoch ms) is more reliable than the Date header.
    date: new Date(Number(msg.internalDate ?? 0)).toISOString(),
    unread: (msg.labelIds ?? []).includes("UNREAD"),
  };
}
