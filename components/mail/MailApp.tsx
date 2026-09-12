"use client";

import { signOut } from "next-auth/react";
import { CopilotKitProvider } from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";
import { useMailSync } from "@/hooks/use-sync";
import { useMailStore } from "@/store/mail-store";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { FolderNav } from "./FolderNav";
import { FilterBar } from "./FilterBar";
import { EmailList } from "./EmailList";
import { EmailDetail } from "./EmailDetail";
import { ComposeModal } from "./ComposeModal";
import { MailOpenIcon } from "./icons";
import { ThemeToggle } from "@/components/theme";

export function MailApp({
  userEmail,
  userName,
}: {
  userEmail: string;
  userName: string;
}) {
  // Starts the 15s incremental-sync poll for the whole app.
  useMailSync();
  const openEmailId = useMailStore((s) => s.openEmailId);
  const assistantOpen = useMailStore((s) => s.assistantOpen);
  const toggleAssistant = useMailStore((s) => s.toggleAssistant);

  return (
    <CopilotKitProvider runtimeUrl="/api/copilotkit">
    <div className="flex h-screen flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-base text-white">
            ✉
          </div>
          <span className="text-[15px] font-semibold tracking-tight">
            Mail Copilot
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-zinc-500 sm:block dark:text-zinc-400">
            {userName ? `${userName} · ` : ""}
            {userEmail}
          </span>
          <ThemeToggle />
          <button
            onClick={toggleAssistant}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              assistantOpen
                ? "border-indigo-300 bg-indigo-50 font-medium text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
            title="Toggle the AI assistant panel"
          >
            ✦ Assistant
          </button>
          <button
            onClick={() => signOut()}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <FolderNav />

        <section className="flex w-100 shrink-0 flex-col border-r border-zinc-200 bg-white 2xl:w-md dark:border-zinc-800 dark:bg-zinc-900">
          <FilterBar />
          <EmailList />
        </section>

        <section className="min-w-0 flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
          {openEmailId ? (
            <EmailDetail id={openEmailId} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600">
                <MailOpenIcon className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                  Nothing open yet
                </p>
                <p className="text-sm text-zinc-400 dark:text-zinc-500">
                  Pick an email from the list
                  {assistantOpen ? " or ask the assistant to find one." : "."}
                </p>
              </div>
            </div>
          )}
        </section>

        {assistantOpen && (
          <aside className="w-95 shrink-0 border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <AssistantPanel userEmail={userEmail} userName={userName} />
          </aside>
        )}
      </div>

      <ComposeModal />
    </div>
    </CopilotKitProvider>
  );
}
