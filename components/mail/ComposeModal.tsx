"use client";

import { useMailStore } from "@/store/mail-store";
import { draftToPayload, useSendEmail } from "@/hooks/use-send";
import { ExpandIcon, MinimizeIcon, SendIcon, XIcon } from "./icons";

/**
 * Gmail-style compose card, bottom-right. Fields are controlled by the store
 * draft — which is what lets the AI assistant fill them visibly. It has two
 * states: expanded (the full card) and minimized (a slim title bar), so the
 * user can tuck it away to read mail without losing the draft.
 */
export function ComposeModal() {
  const compose = useMailStore((s) => s.compose);
  const updateDraft = useMailStore((s) => s.updateDraft);
  const closeCompose = useMailStore((s) => s.closeCompose);
  const setComposeAnimating = useMailStore((s) => s.setComposeAnimating);
  const setComposeMinimized = useMailStore((s) => s.setComposeMinimized);
  const assistantOpen = useMailStore((s) => s.assistantOpen);
  const send = useSendEmail();

  if (!compose.open) return null;

  // Sits left of the assistant panel (380px) + a 16px gap when it's open,
  // so the two never overlap.
  const rightOffset = assistantOpen ? "right-99" : "right-4";
  const title = compose.replyTo ? "Reply" : "New message";

  if (compose.minimized) {
    return (
      <button
        onClick={() => setComposeMinimized(false)}
        className={`fixed bottom-0 z-40 flex w-72 items-center justify-between gap-2 rounded-t-xl border border-b-0 border-zinc-200 bg-white px-4 py-2.5 text-left shadow-lg transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 ${rightOffset}`}
        title="Restore"
      >
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-700 dark:text-zinc-200">
          {compose.draft.subject?.trim() || title}
        </span>
        <span className="flex items-center gap-0.5 text-zinc-400">
          <ExpandIcon className="h-4 w-4" />
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              closeCompose();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                closeCompose();
              }
            }}
            className="rounded p-0.5 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700"
            title="Discard"
          >
            <XIcon className="h-4 w-4" />
          </span>
        </span>
      </button>
    );
  }

  const onSend = () => {
    if (send.isPending || compose.animating) return;
    send.mutate(draftToPayload());
  };

  return (
    <div
      // Clicking anywhere in the card while the assistant is typing snaps the
      // animation to the finished draft — never fight the user.
      onMouseDownCapture={() => compose.animating && setComposeAnimating(false)}
      className={`fixed bottom-4 z-40 flex max-h-[calc(100vh-6rem)] w-[min(580px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 ${rightOffset}`}
    >
      <div className="flex items-center justify-between bg-zinc-900 px-4 py-2.5 text-zinc-100 dark:bg-zinc-800">
        <span className="text-sm font-medium">
          {compose.animating ? "Assistant is drafting…" : title}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setComposeMinimized(true)}
            className="rounded-md p-1 text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100"
            title="Minimize"
          >
            <MinimizeIcon />
          </button>
          <button
            onClick={closeCompose}
            className="rounded-md p-1 text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100"
            title="Discard"
          >
            <XIcon />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
        <Field
          label="To"
          value={compose.draft.to}
          onChange={(to) => updateDraft({ to })}
          placeholder="recipient@example.com"
          fieldName="to"
        />
        <Field
          label="Cc"
          value={compose.draft.cc}
          onChange={(cc) => updateDraft({ cc })}
          placeholder=""
          fieldName="cc"
        />
        <Field
          label="Subject"
          value={compose.draft.subject}
          onChange={(subject) => updateDraft({ subject })}
          placeholder="Subject"
          fieldName="subject"
        />
        <textarea
          value={compose.draft.body}
          onChange={(e) => updateDraft({ body: e.target.value })}
          placeholder="Write your message…"
          rows={9}
          data-compose-field="body"
          className="min-h-32 flex-1 resize-none bg-transparent px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-zinc-400"
        />
      </div>

      <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <button
          onClick={onSend}
          disabled={send.isPending || !compose.draft.to.trim()}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SendIcon />
          {send.isPending ? "Sending…" : "Send"}
        </button>
        {send.isError && (
          <span className="text-xs text-red-500">
            {send.error instanceof Error ? send.error.message : "Send failed"}
          </span>
        )}
        {compose.replyTo && !send.isError && (
          <span className="text-xs text-zinc-400">Replying in thread</span>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  fieldName,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  fieldName: string;
}) {
  return (
    <label className="flex items-center gap-3 px-4 py-2">
      <span className="w-12 shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-compose-field={fieldName}
        className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
      />
    </label>
  );
}
