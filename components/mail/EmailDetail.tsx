"use client";

import { useEffect } from "react";
import { useEmailDetail, useMarkRead } from "@/hooks/use-mailbox";
import { useMailStore } from "@/store/mail-store";
import { formatFullDate, forwardQuote, initials } from "@/lib/format";
import { forwardSubject, replySubject } from "@/lib/gmail/mime";
import { ForwardIcon, ReplyIcon, XIcon } from "./icons";

export function EmailDetail({ id }: { id: string }) {
  const { data, isLoading, isError } = useEmailDetail(id);
  const markRead = useMarkRead();
  const closeEmail = useMailStore((s) => s.closeEmail);
  const openCompose = useMailStore((s) => s.openCompose);

  // Opening an email marks it read — regardless of whether a human clicked
  // the row or the assistant navigated here.
  useEffect(() => {
    if (data?.unread) markRead.mutate({ id: data.id, read: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id, data?.unread]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 p-8">
        <div className="h-6 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-1/3 rounded bg-zinc-100 dark:bg-zinc-800/70" />
        <div className="mt-8 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3 rounded bg-zinc-100 dark:bg-zinc-800/70" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8 text-sm text-zinc-500">
        Couldn&apos;t load this email.
      </div>
    );
  }

  const onReply = () => {
    openCompose(
      {
        // Honor Reply-To when the sender set one (support desks, newsletters).
        to: data.replyTo ?? data.from.email,
        subject: replySubject(data.subject),
      },
      data.messageIdHeader
        ? {
            threadId: data.threadId,
            inReplyTo: data.messageIdHeader,
            references: [data.references, data.messageIdHeader]
              .filter(Boolean)
              .join(" "),
          }
        : undefined
    );
  };

  const onForward = () => {
    openCompose({
      subject: forwardSubject(data.subject),
      body: forwardQuote(data),
    });
  };

  return (
    <article className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h1 className="text-xl font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
          {data.subject}
        </h1>
        <button
          onClick={closeEmail}
          className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          title="Close"
        >
          <XIcon />
        </button>
      </div>

      <div className="mb-6 flex items-center gap-3 border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          {initials(data.from.name, data.from.email)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {data.from.name || data.from.email}
            {data.from.name && (
              <span className="ml-2 font-normal text-zinc-400">
                &lt;{data.from.email}&gt;
              </span>
            )}
          </p>
          <p className="truncate text-xs text-zinc-400">
            to {data.to}
            {data.cc ? `, cc ${data.cc}` : ""} · {formatFullDate(data.date)}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={onReply}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ReplyIcon />
            Reply
          </button>
          <button
            onClick={onForward}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ForwardIcon />
            Forward
          </button>
        </div>
      </div>

      {data.html ? (
        // Sanitized server-side in lib/gmail/sanitize.ts before it ever reaches the client.
        <div
          className="email-body rounded-xl bg-white p-6 text-sm shadow-sm dark:bg-zinc-900"
          dangerouslySetInnerHTML={{ __html: data.html }}
        />
      ) : (
        <pre className="email-body whitespace-pre-wrap rounded-xl bg-white p-6 font-sans text-sm text-zinc-800 shadow-sm dark:bg-zinc-900 dark:text-zinc-200">
          {data.text ?? data.snippet}
        </pre>
      )}
    </article>
  );
}
