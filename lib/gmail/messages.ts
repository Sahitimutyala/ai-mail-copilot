import type { gmail_v1 } from "googleapis";
import type {
  EmailDetail,
  EmailListResponse,
  MailFolder,
} from "@/lib/types";
import { extractBody, headerValue, parseAddress, toEmailSummary } from "./parse";
import { sanitizeEmailHtml } from "./sanitize";

const LIST_HEADERS = ["From", "To", "Subject", "Date"];

export interface ListOptions {
  folder: MailFolder;
  /** Gmail search query (see query.ts) */
  q?: string;
  maxResults?: number;
  pageToken?: string;
}

export async function listMessages(
  gmail: gmail_v1.Gmail,
  { folder, q, maxResults = 25, pageToken }: ListOptions
): Promise<EmailListResponse> {
  const listRes = await gmail.users.messages.list({
    userId: "me",
    labelIds: [folder === "sent" ? "SENT" : "INBOX"],
    q: q || undefined,
    maxResults,
    pageToken,
  });

  const refs = listRes.data.messages ?? [];
  // messages.list returns only ids — hydrate headers with cheap metadata gets.
  const emails = await mapChunked(refs, 10, async (ref) => {
    const res = await gmail.users.messages.get({
      userId: "me",
      id: ref.id!,
      format: "metadata",
      metadataHeaders: LIST_HEADERS,
    });
    return toEmailSummary(res.data);
  });

  return { emails, nextPageToken: listRes.data.nextPageToken ?? null };
}

export async function getMessageDetail(
  gmail: gmail_v1.Gmail,
  id: string
): Promise<EmailDetail> {
  const res = await gmail.users.messages.get({ userId: "me", id, format: "full" });
  const msg = res.data;
  const headers = msg.payload?.headers;
  const { html, text } = extractBody(msg.payload);

  const replyToHeader = headerValue(headers, "Reply-To");

  return {
    ...toEmailSummary(msg),
    cc: headerValue(headers, "Cc") || null,
    // Parsed server-side so client components never import Buffer-using code.
    replyTo: replyToHeader ? parseAddress(replyToHeader).email : null,
    html: html ? sanitizeEmailHtml(html) : null,
    text,
    messageIdHeader: headerValue(headers, "Message-ID") || null,
    references: headerValue(headers, "References") || null,
  };
}

export async function setRead(
  gmail: gmail_v1.Gmail,
  id: string,
  read: boolean
): Promise<void> {
  await gmail.users.messages.modify({
    userId: "me",
    id,
    requestBody: read
      ? { removeLabelIds: ["UNREAD"] }
      : { addLabelIds: ["UNREAD"] },
  });
}

/** Promise.all with bounded concurrency — the Node Gmail client has no batch API. */
async function mapChunked<T, R>(
  items: T[],
  chunkSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    results.push(...(await Promise.all(chunk.map(fn))));
  }
  return results;
}
