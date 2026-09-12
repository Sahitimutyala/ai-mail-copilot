"use client";

import { useEffect, useState } from "react";
import { useMailStore } from "@/store/mail-store";
import { hasActiveFilters } from "@/lib/gmail/query";
import { SearchIcon, XIcon } from "./icons";

/**
 * Filter controls. Text inputs hold local state while typing and commit on
 * Enter/blur (avoids refetching Gmail on every keystroke); the useEffects
 * sync them back whenever the store changes from OUTSIDE — i.e. when the
 * AI assistant applies filters, the inputs visibly update.
 */
export function FilterBar() {
  const filters = useMailStore((s) => s.filters);
  const setFilters = useMailStore((s) => s.setFilters);
  const clearFilters = useMailStore((s) => s.clearFilters);

  const [text, setText] = useState(filters.text ?? "");
  const [from, setFrom] = useState(filters.from ?? "");

  useEffect(() => setText(filters.text ?? ""), [filters.text]);
  useEffect(() => setFrom(filters.from ?? ""), [filters.from]);

  // Only commit real changes — setFilters closes the open email (a new
  // search should show the list), so a no-op blur must not trigger it.
  const commitText = () => {
    const next = text.trim() || undefined;
    if (next !== filters.text) setFilters({ text: next });
  };
  const commitFrom = () => {
    const next = from.trim() || undefined;
    if (next !== filters.from) setFilters({ from: next });
  };
  const onEnter =
    (commit: () => void) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") commit();
    };

  return (
    <div className="flex flex-col gap-2 border-b border-zinc-200 p-3 dark:border-zinc-800">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitText}
          onKeyDown={onEnter(commitText)}
          placeholder="Search mail…"
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-indigo-500 dark:focus:bg-zinc-900"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          onBlur={commitFrom}
          onKeyDown={onEnter(commitFrom)}
          placeholder="From…"
          className="w-28 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs outline-none transition focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-800"
        />
        <input
          type="date"
          value={filters.after ?? ""}
          onChange={(e) => setFilters({ after: e.target.value || undefined })}
          title="After date"
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs text-zinc-600 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        />
        <input
          type="date"
          value={filters.before ?? ""}
          onChange={(e) => setFilters({ before: e.target.value || undefined })}
          title="Before date"
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs text-zinc-600 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        />
        <button
          onClick={() => setFilters({ unreadOnly: !filters.unreadOnly || undefined })}
          className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
            filters.unreadOnly
              ? "border-indigo-300 bg-indigo-50 font-medium text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
              : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          Unread
        </button>
        {hasActiveFilters(filters) && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
            title="Clear all filters"
          >
            <XIcon className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
