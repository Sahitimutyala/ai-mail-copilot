"use client";

import { CopilotChat } from "@copilotkit/react-core/v2";
import { AssistantTools } from "./AssistantTools";
import { AssistantContext } from "./AssistantContext";
import { ConfirmSendTool } from "./ConfirmSendCard";

/**
 * The assistant panel: CopilotKit's embedded chat plus our tool and context
 * registrations. Mounting this component is what gives the LLM its levers
 * (tools) and eyes (context) — unmount it and the AI can do nothing.
 *
 * We use the embedded CopilotChat (not the CopilotSidebar overlay) so the
 * panel lives INSIDE our flex layout — the app owns the geometry, and the
 * compose card can position itself relative to it deterministically.
 */
export function AssistantPanel({
  userEmail,
  userName,
}: {
  userEmail: string;
  userName: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <AssistantTools />
      <ConfirmSendTool />
      <AssistantContext userEmail={userEmail} userName={userName} />
      <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
        ✦ Assistant
      </div>
      <div className="min-h-0 flex-1">
        <CopilotChat className="h-full" />
      </div>
    </div>
  );
}
