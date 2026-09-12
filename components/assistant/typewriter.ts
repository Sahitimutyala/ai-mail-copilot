import { useMailStore } from "@/store/mail-store";
import type { ComposeDraft, ReplyContext } from "@/lib/types";

/**
 * The "fields visibly fill in" effect — the clearest signal that the AI is
 * driving the UI. Opens the compose card and types the AI's draft into the
 * fields character-by-character, ~2 seconds total regardless of length.
 *
 * Escape hatch: anything that sets compose.animating = false (e.g. the user
 * clicking into the card — see ComposeModal) makes the animation snap to the
 * finished draft instantly. Never fight the user for the keyboard.
 */
export async function typeIntoCompose(
  target: Partial<ComposeDraft>,
  options: { replyTo?: ReplyContext; fresh?: boolean } = {}
): Promise<void> {
  const store = useMailStore.getState();
  const { fresh = true } = options;
  if (fresh || !store.compose.open) {
    // New draft from scratch.
    store.openCompose({}, options.replyTo);
  }
  store.setComposeAnimating(true);

  const fields: (keyof ComposeDraft)[] = ["to", "cc", "subject", "body"];
  const totalChars = fields.reduce(
    (sum, f) => sum + (target[f]?.length ?? 0),
    0
  );
  // Split a ~1.8s budget across all characters; clamp per-tick delay to
  // stay snappy for short drafts and finish long ones on time.
  const perChar = clamp(1800 / Math.max(totalChars, 1), 4, 28);
  // Long bodies type several chars per tick so the tick rate stays smooth.
  const chunk = perChar <= 6 ? 3 : 1;

  for (const field of fields) {
    const text = target[field];
    if (!text) continue;
    for (let i = chunk; i < text.length + chunk; i += chunk) {
      if (!useMailStore.getState().compose.animating) {
        // User interrupted (or something closed the modal): finish instantly.
        useMailStore.getState().updateDraft(target);
        return;
      }
      useMailStore.getState().updateDraft({ [field]: text.slice(0, i) });
      await sleep(perChar * chunk);
    }
  }

  useMailStore.getState().setComposeAnimating(false);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
