"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMailStore } from "@/store/mail-store";
import { fetchJson } from "@/lib/fetch-json";

export interface SendPayload {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
}

export function useSendEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendPayload) =>
      fetchJson<{ id: string }>("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      useMailStore.getState().closeCompose();
      // The Sent list (and threading) changed.
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

/** Gathers the current draft + reply context from the store into a payload. */
export function draftToPayload(): SendPayload {
  const { compose } = useMailStore.getState();
  return {
    to: compose.draft.to,
    cc: compose.draft.cc || undefined,
    subject: compose.draft.subject,
    body: compose.draft.body,
    threadId: compose.replyTo?.threadId,
    inReplyTo: compose.replyTo?.inReplyTo,
    references: compose.replyTo?.references,
  };
}
