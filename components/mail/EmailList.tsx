"use client";

import { useEmailList, useMarkRead } from "@/hooks/use-mailbox";
import { useMailStore } from "@/store/mail-store";
import { formatListDate, initials } from "@/lib/format";
import { ApiError } from "@/lib/fetch-json";
import type { EmailSummary } from "@/lib/types";

export function EmailList() {
  const { data, isLoading, isError, error, refetch } = useEmailList();

  if (isLoading) return <ListSkeleton />;

  if (isError) {
    const status = error instanceof ApiError ? error.status : undefined;
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-sm text-zinc-500">
          {status === 401
            ? "Your session expired."
            : "Couldn't load emails."}
        </p>
        <button
          onClick={() =>
            status === 401 ? window.location.reload() : refetch()
          }
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          {status === 401 ? "Sign in again" : "Retry"}
        </button>
      </div>
    );
  }

  if (!data || data.emails.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
        No emails match the current filters.
      </div>
    );
  }

  return (
    <ul className="flex-1 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
      {data.emails.map((email) => (
        <EmailRow key={email.id} email={email} />
      ))}
    </ul>
  );
}

function EmailRow({ email }: { email: EmailSummary }) {
  const openEmailId = useMailStore((s) => s.openEmailId);
  const openEmail = useMailStore((s) => s.openEmail);
  const markRead = useMarkRead();
  const selected = openEmailId === email.id;

  const onOpen = () => {
    openEmail(email.id);
    if (email.unread) markRead.mutate({ id: email.id, read: true });
  };

  return (
    <li>
      <button
        onClick={onOpen}
        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
          selected
            ? "bg-indigo-50 dark:bg-indigo-950/50"
            : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
        }`}
      >
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
          {initials(email.from.name, email.from.email)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span
              className={`truncate text-sm ${
                email.unread
                  ? "font-semibold text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {email.from.name || email.from.email}
            </span>
            <span className="shrink-0 text-xs text-zinc-400">
              {formatListDate(email.date)}
            </span>
          </span>
          <span
            className={`block truncate text-sm ${
              email.unread
                ? "font-medium text-zinc-800 dark:text-zinc-200"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {email.subject}
          </span>
          <span className="block truncate text-xs text-zinc-400 dark:text-zinc-500">
            {email.snippet}
          </span>
        </span>
        {email.unread && (
          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-500" aria-label="Unread" />
        )}
      </button>
    </li>
  );
}

function ListSkeleton() {
  return (
    <div className="animate-pulse divide-y divide-zinc-100 dark:divide-zinc-800">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-3 px-4 py-3.5">
          <div className="h-9 w-9 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex-1 space-y-2 py-0.5">
            <div className="h-3 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-1/2 rounded bg-zinc-100 dark:bg-zinc-800/70" />
          </div>
        </div>
      ))}
    </div>
  );
}
