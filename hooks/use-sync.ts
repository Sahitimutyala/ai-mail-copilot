"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMailStore } from "@/store/mail-store";
import { fetchJson } from "@/lib/fetch-json";
import type { SyncResponse } from "@/lib/types";

/**
 * Realtime baseline: poll the incremental-sync endpoint every 15 seconds.
 * When Gmail reports changes, invalidate the React Query caches so the
 * inbox re-renders — new mail appears with no manual refresh.
 *
 * This is the guaranteed baseline. A push tier (Gmail users.watch → Pub/Sub →
 * webhook → browser) could trigger the same refetch in ~1s; this poll would
 * then stay on as the automatic fallback. See the README trade-offs section.
 */
export function useMailSync() {
  const queryClient = useQueryClient();

  useQuery({
    queryKey: ["sync"],
    queryFn: async (): Promise<SyncResponse> => {
      const cursor = useMailStore.getState().historyId;
      const data = await fetchJson<SyncResponse>(
        `/api/mail/sync${cursor ? `?historyId=${cursor}` : ""}`
      );
      useMailStore.getState().setHistoryId(data.historyId);
      if (data.fullResync || data.changedIds.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["messages"] });
        queryClient.invalidateQueries({ queryKey: ["message"] });
      }
      return data;
    },
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
