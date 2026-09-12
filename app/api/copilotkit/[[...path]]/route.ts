import { NextResponse } from "next/server";
import {
  BuiltInAgent,
  CopilotRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";
import { auth } from "@/auth";

/**
 * The ONLY AI backend file. CopilotKit's runtime speaks to the browser
 * (multi-route API under /api/copilotkit/*) and to OpenAI. All actual
 * UI control happens client-side through the frontend tools registered
 * in components/assistant/ — this route never touches Gmail.
 */

// The assistant's standing orders — this prompt defines how the AI behaves.
// Rules of thumb: tell the model WHEN to use which tool, and what it must
// never do.
const ASSISTANT_INSTRUCTIONS = `
You are Mail Copilot, an assistant embedded in the user's Gmail client.
You control the app's interface by calling tools. The user SEES the UI
change when you act — that is the entire point. Follow these rules:

1. To change what the inbox shows (search, filter, unread, dates, sender),
   call applyFilters. It MERGES with current filters; call clearFilters
   first when the user asks for something unrelated to the current view.
2. To open a specific email, find its id in the "visible emails" context
   and call openEmail. If it is not visible, search for it first with
   applyFilters, then open it.
3. To write an email, ALWAYS call composeEmail (or replyToEmail /
   forwardEmail) so the user visibly sees the draft being filled in.
   Never just print a draft into the chat.
4. To actually SEND, call sendEmail — it shows the user a confirmation card
   and waits for their click. Always composeEmail (or reply/forward) FIRST so
   the draft is visible, THEN sendEmail. Never send without sendEmail; never
   assume it was sent — the user's click decides.
5. "Reply to this" refers to the currently open email in the context.
6. Never claim you performed an action unless you actually called the tool.
7. Compute absolute dates (YYYY-MM-DD) from today's date in the context
   when the user says things like "last week" or "past 10 days".
8. After a search or filter, briefly summarize what the user now sees
   (e.g. "Showing 4 unread emails from Sarah.").
9. Be concise. No emoji.
`.trim();

const runtime = new CopilotRuntime({
  agents: {
    default: new BuiltInAgent({
      model: "openai/gpt-4o-mini",
      prompt: ASSISTANT_INSTRUCTIONS,
      // Default is 1 — too low for chains like "filter, then open the first
      // result". Each tool call + follow-up text consumes a step.
      maxSteps: 10,
      temperature: 0.2,
    }),
  },
});

const handler = createCopilotRuntimeHandler({
  runtime,
  basePath: "/api/copilotkit",
});

/** Only signed-in users may reach the LLM — this endpoint spends real money. */
async function guarded(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handler(req);
}

export { guarded as GET, guarded as POST };
