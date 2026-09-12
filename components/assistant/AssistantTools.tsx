"use client";

import { useFrontendTool } from "@copilotkit/react-core/v2";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useMailStore } from "@/store/mail-store";
import { buildGmailQuery, describeFilters } from "@/lib/gmail/query";
import { forwardSubject, replySubject } from "@/lib/gmail/mime";
import { forwardQuote } from "@/lib/format";
import { fetchEmailDetail, fetchEmailList } from "@/hooks/use-mailbox";
import { fetchJson } from "@/lib/fetch-json";
import type { EmailListResponse, Filters, MailFolder } from "@/lib/types";
import { typeIntoCompose } from "./typewriter";

/**
 * Every lever the assistant can pull. Handlers run IN THE BROWSER and only
 * call the same store actions / API routes the human UI uses — the AI can't
 * do anything a user couldn't do by clicking. Handlers stay single-turn
 * (mutate state, return a short string for the model to narrate).
 */
export function AssistantTools() {
  const queryClient = useQueryClient();

  /** Fetches through the React Query cache, so the UI and the AI share data. */
  const fetchListCached = (filters: Filters): Promise<EmailListResponse> => {
    const q = buildGmailQuery(filters);
    return queryClient.fetchQuery({
      queryKey: ["messages", filters.folder, q],
      queryFn: () => fetchEmailList(filters.folder, q),
      staleTime: 10_000,
    });
  };

  const detailCached = (id: string) =>
    queryClient.fetchQuery({
      queryKey: ["message", id],
      queryFn: () => fetchEmailDetail(id),
      staleTime: 5 * 60_000,
    });

  useFrontendTool({
    name: "composeEmail",
    description:
      "Open the compose window and visibly fill in the draft. Use for any new email the user asks you to write. All fields optional — fill what you know.",
    parameters: z.object({
      to: z.string().optional().describe("Recipient email address"),
      cc: z.string().optional(),
      subject: z.string().optional(),
      body: z.string().optional().describe("Plain-text body"),
    }),
    handler: async (draft) => {
      await typeIntoCompose(draft, { fresh: true });
      return "Compose window is open and filled. The user reviews it and clicks Send themselves.";
    },
  });

  useFrontendTool({
    name: "updateComposeDraft",
    description:
      "Change fields of the compose draft that is already open (e.g. rewrite the body, change the subject). Only pass the fields to change.",
    parameters: z.object({
      to: z.string().optional(),
      cc: z.string().optional(),
      subject: z.string().optional(),
      body: z.string().optional(),
    }),
    handler: async (partial) => {
      if (!useMailStore.getState().compose.open) {
        return "No compose window is open — use composeEmail instead.";
      }
      await typeIntoCompose(partial, { fresh: false });
      return "Draft updated.";
    },
  });

  useFrontendTool({
    name: "applyFilters",
    description:
      "Filter/search the email list in the MAIN UI. MERGES with current filters — call clearFilters first for a fresh search. Returns how many emails match.",
    parameters: z.object({
      unreadOnly: z.boolean().optional().describe("Only unread emails"),
      from: z.string().optional().describe("Sender name or email"),
      subject: z.string().optional().describe("Words that must appear in the subject"),
      text: z.string().optional().describe("Free-text search over the whole email"),
      after: z.string().optional().describe("YYYY-MM-DD — emails on/after this date"),
      before: z.string().optional().describe("YYYY-MM-DD — emails before this date"),
      folder: z.enum(["inbox", "sent"]).optional(),
      raw: z
        .string()
        .optional()
        .describe(
          'Escape hatch: raw Gmail search operators, e.g. "has:attachment"'
        ),
    }),
    handler: async (partial) => {
      const store = useMailStore.getState();
      store.setFilters(partial as Partial<Filters>);
      const filters = useMailStore.getState().filters;
      const result = await fetchListCached(filters);
      const n = result.emails.length;
      return `Main list now shows ${n}${n === 25 ? "+" : ""} emails (${describeFilters(filters)}). Top results: ${result.emails
        .slice(0, 5)
        .map((e) => `"${e.subject}" from ${e.from.name || e.from.email} [id ${e.id}]`)
        .join("; ")}`;
    },
  });

  useFrontendTool({
    name: "clearFilters",
    description: "Reset all filters/search on the email list (keeps the current folder).",
    handler: async () => {
      useMailStore.getState().clearFilters();
      return "Filters cleared — the full list is showing.";
    },
  });

  useFrontendTool({
    name: "openEmail",
    description:
      "Open one email in the reading pane. Get the emailId from the visible-emails context or from an applyFilters result.",
    parameters: z.object({
      emailId: z.string().describe("The Gmail message id"),
    }),
    handler: async ({ emailId }) => {
      useMailStore.getState().openEmail(emailId);
      try {
        const detail = await detailCached(emailId);
        return `Opened "${detail.subject}" from ${detail.from.name || detail.from.email}.`;
      } catch {
        return "Opened the email.";
      }
    },
  });

  useFrontendTool({
    name: "replyToEmail",
    description:
      'Open a pre-filled reply. If emailId is omitted, replies to the currently open email ("reply to this"). Fills the body you provide with a visible typing effect.',
    parameters: z.object({
      emailId: z.string().optional(),
      body: z.string().optional().describe("The reply text"),
    }),
    handler: async ({ emailId, body }) => {
      const id = emailId ?? useMailStore.getState().openEmailId;
      if (!id) return "No email is open — open one first or provide an emailId.";
      const original = await detailCached(id);
      await typeIntoCompose(
        {
          to: original.replyTo ?? original.from.email,
          subject: replySubject(original.subject),
          body: body ?? "",
        },
        {
          fresh: true,
          replyTo: original.messageIdHeader
            ? {
                threadId: original.threadId,
                inReplyTo: original.messageIdHeader,
                references: [original.references, original.messageIdHeader]
                  .filter(Boolean)
                  .join(" "),
              }
            : undefined,
        }
      );
      return `Reply to "${original.subject}" is drafted. The user reviews and clicks Send.`;
    },
  });

  useFrontendTool({
    name: "forwardEmail",
    description:
      "Forward an email (the open one if emailId is omitted) to a new recipient, with an optional note above the quoted original.",
    parameters: z.object({
      emailId: z.string().optional(),
      to: z.string().describe("Recipient email address"),
      note: z.string().optional().describe("Text to place above the forwarded content"),
    }),
    handler: async ({ emailId, to, note }) => {
      const id = emailId ?? useMailStore.getState().openEmailId;
      if (!id) return "No email is open — open one first or provide an emailId.";
      const original = await detailCached(id);
      await typeIntoCompose(
        {
          to,
          subject: forwardSubject(original.subject),
          body: (note ?? "") + forwardQuote(original),
        },
        { fresh: true }
      );
      return `Forward of "${original.subject}" is drafted to ${to}.`;
    },
  });

  useFrontendTool({
    name: "navigate",
    description: "Switch the main view between the Inbox and Sent folders.",
    parameters: z.object({
      folder: z.enum(["inbox", "sent"]),
    }),
    handler: async ({ folder }) => {
      useMailStore.getState().navigate(folder as MailFolder);
      return `Now showing ${folder}.`;
    },
  });

  useFrontendTool({
    name: "markRead",
    description: "Mark one or more emails as read or unread.",
    parameters: z.object({
      emailIds: z.array(z.string()).max(25),
      read: z.boolean(),
    }),
    handler: async ({ emailIds, read }) => {
      await Promise.all(
        emailIds.map((id) =>
          fetchJson(`/api/mail/messages/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ read }),
          })
        )
      );
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      return `Marked ${emailIds.length} email(s) as ${read ? "read" : "unread"}.`;
    },
  });

  return null;
}
