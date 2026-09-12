"use client";

import { useState } from "react";
import { useHumanInTheLoop } from "@copilotkit/react-core/v2";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useMailStore } from "@/store/mail-store";
import { fetchJson } from "@/lib/fetch-json";

/**
 * Human-in-the-loop send confirmation.
 *
 * The assistant NEVER sends silently. When the user asks to send, the model
 * calls this tool, which pauses the conversation and renders a preview card
 * with Send / Cancel. The agent only continues once the user clicks — that
 * click is the human in the loop.
 */
export function ConfirmSendTool() {
  useHumanInTheLoop({
    name: "sendEmail",
    description:
      "Send an email — but this shows the user a confirmation card first and waits for their click. Call this only after composeEmail/replyToEmail so the user has already seen the draft fill in. Pass the final to/subject/body.",
    parameters: z.object({
      to: z.string().describe("Recipient email address"),
      subject: z.string(),
      body: z.string(),
    }),
    render: SendConfirmCard,
  });
  return null;
}

type CardProps = {
  args: { to?: string; subject?: string; body?: string };
  result?: string;
  respond?: (result: unknown) => Promise<void>;
};

function SendConfirmCard({ args, result, respond }: CardProps) {
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Terminal state: the agent already got our answer.
  if (result) {
    const cancelled = result.toLowerCase().includes("cancel");
    return (
      <StatusPill ok={!cancelled}>
        {cancelled ? "Cancelled — nothing was sent." : "Email sent ✓"}
      </StatusPill>
    );
  }

  // While the model is still streaming the args, respond isn't available yet.
  const ready = typeof respond === "function";

  const onConfirm = async () => {
    if (!respond || sending) return;
    setSending(true);
    setError(null);
    try {
      // The store draft carries reply-threading context (threadId, In-Reply-To,
      // References) that the model's args don't — merge them in.
      const compose = useMailStore.getState().compose;
      await fetchJson("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: args.to ?? compose.draft.to,
          subject: args.subject ?? compose.draft.subject,
          body: args.body ?? compose.draft.body,
          threadId: compose.replyTo?.threadId,
          inReplyTo: compose.replyTo?.inReplyTo,
          references: compose.replyTo?.references,
        }),
      });
      useMailStore.getState().closeCompose();
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      await respond("Email sent successfully.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Send failed";
      setError(message);
      setSending(false);
    }
  };

  const onCancel = async () => {
    if (respond) await respond("User cancelled — the email was not sent.");
  };

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-zinc-200 bg-white text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="border-b border-zinc-100 bg-zinc-50 px-3 py-2 font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-200">
        Send this email?
      </div>
      <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
        <Row label="To" value={args.to} />
        <Row label="Subject" value={args.subject} />
      </dl>
      <div className="max-h-40 overflow-y-auto whitespace-pre-wrap px-3 py-2 text-zinc-600 dark:text-zinc-300">
        {args.body || <span className="text-zinc-400">(empty body)</span>}
      </div>
      {error && (
        <p className="px-3 pb-2 text-xs text-red-500">Couldn&apos;t send: {error}</p>
      )}
      <div className="flex justify-end gap-2 border-t border-zinc-100 px-3 py-2 dark:border-zinc-800">
        <button
          onClick={onCancel}
          disabled={!ready || sending}
          className="rounded-lg px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={!ready || sending}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex gap-2 px-3 py-1.5">
      <dt className="w-16 shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 truncate text-zinc-700 dark:text-zinc-200">
        {value || <span className="text-zinc-400">—</span>}
      </dd>
    </div>
  );
}

function StatusPill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`my-2 rounded-lg px-3 py-2 text-sm ${
        ok
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
      }`}
    >
      {children}
    </div>
  );
}
