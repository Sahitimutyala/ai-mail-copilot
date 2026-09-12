import type { Filters } from "@/lib/types";

/**
 * Translates our Filters object into a Gmail search query string —
 * the single point where app filters become Gmail's `q=` syntax
 * (same operators as the Gmail search box). Used by the API routes
 * and by React Query cache keys, so human-set and AI-set filters
 * always resolve identically.
 *
 * Note: the folder is NOT part of the query — it is passed to the
 * API as labelIds (INBOX / SENT), which is cheaper and unambiguous.
 */
export function buildGmailQuery(filters: Filters): string {
  const parts: string[] = [];

  if (filters.unreadOnly) parts.push("is:unread");
  if (filters.from) parts.push(`from:${quoteTerm(filters.from)}`);
  if (filters.subject) parts.push(`subject:${quoteTerm(filters.subject)}`);
  // Free text searches the whole message (headers + body), no operator needed.
  if (filters.text) parts.push(quoteTerm(filters.text));
  if (filters.after) parts.push(`after:${toGmailDate(filters.after)}`);
  if (filters.before) parts.push(`before:${toGmailDate(filters.before)}`);
  // Raw Gmail operators pass through untouched (assistant escape hatch).
  if (filters.raw) parts.push(filters.raw.trim());

  return parts.join(" ");
}

/** Gmail expects YYYY/MM/DD; our filters carry YYYY-MM-DD. */
export function toGmailDate(isoDate: string): string {
  return isoDate.replaceAll("-", "/");
}

/** Multi-word terms must be quoted or Gmail treats each word separately. */
function quoteTerm(term: string): string {
  const cleaned = term.trim().replaceAll('"', "");
  return /\s/.test(cleaned) ? `"${cleaned}"` : cleaned;
}

/** Human-readable summary, shown in the filter bar and given to the AI as context. */
export function describeFilters(filters: Filters): string {
  const bits: string[] = [];
  if (filters.unreadOnly) bits.push("unread only");
  if (filters.from) bits.push(`from "${filters.from}"`);
  if (filters.subject) bits.push(`subject contains "${filters.subject}"`);
  if (filters.text) bits.push(`matching "${filters.text}"`);
  if (filters.after) bits.push(`after ${filters.after}`);
  if (filters.before) bits.push(`before ${filters.before}`);
  if (filters.raw) bits.push(`Gmail query: ${filters.raw}`);
  return bits.length ? bits.join(", ") : "no filters";
}

export function hasActiveFilters(filters: Filters): boolean {
  return Boolean(
    filters.unreadOnly ||
      filters.from ||
      filters.subject ||
      filters.text ||
      filters.after ||
      filters.before ||
      filters.raw
  );
}
