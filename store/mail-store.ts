import { create } from "zustand";
import type {
  ComposeDraft,
  Filters,
  MailFolder,
  ReplyContext,
} from "@/lib/types";

/**
 * Single source of truth for everything visible on screen.
 *
 * Both the human UI (FilterBar, folder nav, buttons) and the AI assistant's
 * tools call these same actions — which is what makes "the assistant controls
 * the UI" work structurally: an AI filter change and a human filter change
 * are literally the same state transition.
 */

const EMPTY_DRAFT: ComposeDraft = { to: "", cc: "", subject: "", body: "" };

interface ComposeState {
  open: boolean;
  /** Collapsed to a title bar (Gmail-style), keeping the draft intact */
  minimized: boolean;
  draft: ComposeDraft;
  /** True while the typewriter fill animation is running (assistant compose) */
  animating: boolean;
  replyTo?: ReplyContext;
}

interface MailStore {
  /** Active filters — includes the current folder */
  filters: Filters;
  openEmailId: string | null;
  compose: ComposeState;
  /** Gmail history cursor for incremental sync */
  historyId: string | null;
  /** Whether the embedded assistant panel is visible */
  assistantOpen: boolean;

  toggleAssistant: () => void;
  navigate: (folder: MailFolder) => void;
  setFilters: (partial: Partial<Filters>) => void;
  clearFilters: () => void;
  openEmail: (id: string) => void;
  closeEmail: () => void;
  openCompose: (draft?: Partial<ComposeDraft>, replyTo?: ReplyContext) => void;
  updateDraft: (partial: Partial<ComposeDraft>) => void;
  setComposeAnimating: (animating: boolean) => void;
  setComposeMinimized: (minimized: boolean) => void;
  closeCompose: () => void;
  setHistoryId: (historyId: string) => void;
}

export const useMailStore = create<MailStore>()((set) => ({
  filters: { folder: "inbox" },
  openEmailId: null,
  compose: { open: false, minimized: false, draft: EMPTY_DRAFT, animating: false },
  historyId: null,
  assistantOpen: true,

  toggleAssistant: () => set((s) => ({ assistantOpen: !s.assistantOpen })),

  navigate: (folder) =>
    set({ filters: { folder }, openEmailId: null }),

  setFilters: (partial) =>
    set((s) => ({
      filters: { ...s.filters, ...partial },
      // A new search should show the list, not a stale open email.
      openEmailId: null,
    })),

  clearFilters: () =>
    set((s) => ({ filters: { folder: s.filters.folder } })),

  openEmail: (id) => set({ openEmailId: id }),

  closeEmail: () => set({ openEmailId: null }),

  openCompose: (draft, replyTo) =>
    set({
      compose: {
        open: true,
        minimized: false,
        draft: { ...EMPTY_DRAFT, ...draft },
        animating: false,
        replyTo,
      },
    }),

  updateDraft: (partial) =>
    set((s) => ({
      compose: { ...s.compose, draft: { ...s.compose.draft, ...partial } },
    })),

  setComposeAnimating: (animating) =>
    set((s) => ({ compose: { ...s.compose, animating } })),

  setComposeMinimized: (minimized) =>
    set((s) => ({ compose: { ...s.compose, minimized } })),

  closeCompose: () =>
    set((s) => ({
      compose: {
        open: false,
        minimized: false,
        draft: s.compose.draft,
        animating: false,
      },
    })),

  setHistoryId: (historyId) => set({ historyId }),
}));
