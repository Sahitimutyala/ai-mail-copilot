export type MailFolder = "inbox" | "sent";

export interface EmailAddress {
  name: string;
  email: string;
}

export interface EmailSummary {
  id: string;
  threadId: string;
  from: EmailAddress;
  to: string;
  subject: string;
  snippet: string;
  /** ISO 8601 */
  date: string;
  unread: boolean;
}

export interface EmailDetail extends EmailSummary {
  cc: string | null;
  /** Parsed Reply-To address (email only) when the sender set one */
  replyTo: string | null;
  /** Sanitized HTML body, ready to render */
  html: string | null;
  /** Plain-text body fallback */
  text: string | null;
  /** RFC 2822 Message-ID header — needed to thread replies */
  messageIdHeader: string | null;
  /** RFC 2822 References header — needed to thread replies */
  references: string | null;
}

export interface Filters {
  folder: MailFolder;
  unreadOnly?: boolean;
  from?: string;
  subject?: string;
  /** Free-text search across the whole message */
  text?: string;
  /** YYYY-MM-DD (inclusive) */
  after?: string;
  /** YYYY-MM-DD (exclusive) */
  before?: string;
  /** Raw Gmail query appended verbatim — AI escape hatch (e.g. "has:attachment") */
  raw?: string;
}

export interface ComposeDraft {
  to: string;
  cc: string;
  subject: string;
  body: string;
}

/** Carried on a draft so the send route can thread the reply correctly. */
export interface ReplyContext {
  threadId: string;
  inReplyTo: string;
  references: string;
}

export interface EmailListResponse {
  emails: EmailSummary[];
  nextPageToken: string | null;
}

export interface SyncResponse {
  historyId: string;
  changedIds: string[];
  fullResync: boolean;
}
