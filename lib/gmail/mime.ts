/**
 * Builds the raw RFC 2822 message Gmail's send endpoint expects.
 * Pure string work — no I/O — so it is fully unit-testable.
 *
 * Reply threading requires three things together (Gmail docs):
 *  1. threadId on the send request (handled by the send route)
 *  2. In-Reply-To / References headers referencing the original Message-ID
 *  3. A matching "Re: " subject
 */

export interface MimeOptions {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}

export function buildMime(options: MimeOptions): string {
  // Header injection defense: user- (or AI-) supplied values must never
  // contain CR/LF, or "a@b.com\r\nBcc: attacker@evil.com" would smuggle
  // extra headers into the raw message. Fold any newlines to spaces.
  const to = headerSafe(options.to);
  const cc = options.cc ? headerSafe(options.cc) : undefined;
  const inReplyTo = options.inReplyTo ? headerSafe(options.inReplyTo) : undefined;
  const references = options.references ? headerSafe(options.references) : undefined;

  const headers: string[] = [
    `To: ${to}`,
    ...(cc ? [`Cc: ${cc}`] : []),
    `Subject: ${encodeSubject(headerSafe(options.subject))}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    ...(inReplyTo ? [`In-Reply-To: ${inReplyTo}`] : []),
    ...(references ? [`References: ${references}`] : []),
  ];
  // Note: no From header — Gmail stamps the authenticated user automatically.
  return [...headers, "", options.body].join("\r\n");
}

function headerSafe(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

/** Gmail wants the raw message base64url-encoded. */
export function toRaw(mime: string): string {
  return Buffer.from(mime, "utf8").toString("base64url");
}

/** Non-ASCII subjects must be RFC 2047 encoded or they arrive garbled. */
export function encodeSubject(subject: string): string {
  if (/^[\x20-\x7e]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}

/** "Re: " prefixing that doesn't stack ("Re: Re: ..."). */
export function replySubject(subject: string): string {
  return /^re:/i.test(subject.trim()) ? subject : `Re: ${subject}`;
}

export function forwardSubject(subject: string): string {
  return /^fwd?:/i.test(subject.trim()) ? subject : `Fwd: ${subject}`;
}
