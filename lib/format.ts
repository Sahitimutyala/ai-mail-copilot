/** Client-safe date helpers for list rows and the detail view. */

export function formatListDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Quoted original message for forwards — shared by the UI button and the AI tool. */
export function forwardQuote(email: {
  from: { name: string; email: string };
  to: string;
  subject: string;
  date: string;
  text: string | null;
  snippet: string;
}): string {
  return [
    "",
    "",
    "---------- Forwarded message ----------",
    `From: ${email.from.name} <${email.from.email}>`,
    `Date: ${formatFullDate(email.date)}`,
    `Subject: ${email.subject}`,
    `To: ${email.to}`,
    "",
    email.text ?? email.snippet,
  ].join("\n");
}

export function initials(name: string, email: string): string {
  const source = name || email;
  const words = source.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}
