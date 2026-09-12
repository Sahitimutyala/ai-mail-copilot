import type { gmail_v1 } from "googleapis";
import type { SyncResponse } from "@/lib/types";

/**
 * Incremental sync via Gmail's history API.
 *
 * The client holds a historyId cursor. Each poll (or push notification)
 * asks "what changed since cursor X?" — costing only 2 quota units.
 * Gmail keeps history for a limited window; a stale cursor returns 404,
 * which we surface as fullResync so the client refetches its lists and
 * re-seeds the cursor.
 */
export async function getSyncDelta(
  gmail: gmail_v1.Gmail,
  startHistoryId?: string
): Promise<SyncResponse> {
  if (!startHistoryId) {
    // First call: no cursor yet — seed one from the profile.
    return {
      historyId: await getProfileHistoryId(gmail),
      changedIds: [],
      fullResync: false,
    };
  }

  try {
    const changed = new Set<string>();
    let historyId = startHistoryId;
    let pageToken: string | undefined;

    do {
      const res = await gmail.users.history.list({
        userId: "me",
        startHistoryId,
        historyTypes: ["messageAdded", "labelAdded", "labelRemoved"],
        maxResults: 100,
        pageToken,
      });
      historyId = res.data.historyId ?? historyId;
      for (const record of res.data.history ?? []) {
        const events = [
          ...(record.messagesAdded ?? []),
          ...(record.labelsAdded ?? []),
          ...(record.labelsRemoved ?? []),
        ];
        for (const event of events) {
          if (event.message?.id) changed.add(event.message.id);
        }
      }
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);

    return { historyId, changedIds: [...changed], fullResync: false };
  } catch (error) {
    if ((error as { code?: number }).code === 404) {
      // Cursor expired — caller must refetch everything.
      return {
        historyId: await getProfileHistoryId(gmail),
        changedIds: [],
        fullResync: true,
      };
    }
    throw error;
  }
}

export async function getProfileHistoryId(
  gmail: gmail_v1.Gmail
): Promise<string> {
  const res = await gmail.users.getProfile({ userId: "me" });
  return String(res.data.historyId ?? "");
}
