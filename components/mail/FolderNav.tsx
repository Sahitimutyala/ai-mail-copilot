"use client";

import { useMailStore } from "@/store/mail-store";
import type { MailFolder } from "@/lib/types";
import { InboxIcon, PencilIcon, SendIcon } from "./icons";

export function FolderNav() {
  const folder = useMailStore((s) => s.filters.folder);
  const navigate = useMailStore((s) => s.navigate);
  const openCompose = useMailStore((s) => s.openCompose);

  return (
    <nav className="flex w-48 shrink-0 flex-col gap-1 border-r border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <button
        onClick={() => openCompose()}
        className="mb-2 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
      >
        <PencilIcon />
        Compose
      </button>

      <FolderButton
        label="Inbox"
        folder="inbox"
        active={folder === "inbox"}
        onSelect={navigate}
        icon={<InboxIcon />}
      />
      <FolderButton
        label="Sent"
        folder="sent"
        active={folder === "sent"}
        onSelect={navigate}
        icon={<SendIcon />}
      />
    </nav>
  );
}

function FolderButton({
  label,
  folder,
  active,
  onSelect,
  icon,
}: {
  label: string;
  folder: MailFolder;
  active: boolean;
  onSelect: (folder: MailFolder) => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={() => onSelect(folder)}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
        active
          ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
