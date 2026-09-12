"use client";

import {
  useAgentContext,
  type JsonSerializable,
} from "@copilotkit/react-core/v2";

// Our typed interfaces are plain JSON data, but TS interfaces lack the index
// signature JsonSerializable structurally requires — hence the unknown hop.
const asJson = (value: unknown) => value as JsonSerializable;
import { useMailStore } from "@/store/mail-store";
import { useEmailDetail, useEmailList } from "@/hooks/use-mailbox";
import { describeFilters } from "@/lib/gmail/query";

/**
 * Everything the assistant can "see". Each useAgentContext value rides along
 * with every model request, so keep them lean — snippets, not bodies.
 * This is what makes "reply to this" and "open the one from David" work.
 */
export function AssistantContext({
  userEmail,
  userName,
}: {
  userEmail: string;
  userName: string;
}) {
  const filters = useMailStore((s) => s.filters);
  const openEmailId = useMailStore((s) => s.openEmailId);
  const compose = useMailStore((s) => s.compose);
  const { data: list } = useEmailList();
  const { data: openEmail } = useEmailDetail(openEmailId);

  useAgentContext({
    description:
      "Today's date (YYYY-MM-DD) — use it to compute absolute dates for filters",
    value: new Date().toISOString().slice(0, 10),
  });

  useAgentContext({
    description: "The signed-in user (sender of all outgoing mail)",
    value: { email: userEmail, name: userName },
  });

  useAgentContext({
    description:
      "Current mailbox view: folder, active filters, and whether an email is open",
    value: asJson({
      folder: filters.folder,
      filters,
      filtersInWords: describeFilters(filters),
      openEmailId,
      composeOpen: compose.open,
    }),
  });

  useAgentContext({
    description:
      "Visible emails (top of the current list). Use these ids for openEmail/replyToEmail/markRead",
    value: (list?.emails ?? []).slice(0, 20).map((e) => ({
      id: e.id,
      from: e.from.name || e.from.email,
      fromEmail: e.from.email,
      subject: e.subject,
      date: e.date,
      unread: e.unread,
      snippet: e.snippet.slice(0, 120),
    })),
  });

  useAgentContext({
    description:
      'The currently OPEN email — this is what "this email" / "reply to this" refers to',
    value: asJson(
      openEmail
        ? {
            id: openEmail.id,
            from: openEmail.from,
            to: openEmail.to,
            subject: openEmail.subject,
            date: openEmail.date,
            bodyPreview: (openEmail.text ?? openEmail.snippet).slice(0, 800),
          }
        : "no email is open"
    ),
  });

  useAgentContext({
    description: "The compose draft currently on screen (if any)",
    value: asJson(compose.open ? compose.draft : "compose is closed"),
  });

  return null;
}
