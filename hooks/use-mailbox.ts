"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMailStore } from "@/store/mail-store";
import { buildGmailQuery } from "@/lib/gmail/query";
import { fetchJson } from "@/lib/fetch-json";
import type { EmailDetail, EmailListResponse } from "@/lib/types";

/**
 * Server-data hooks. The list query key derives from the SAME filter state
 * the store holds, so any filter change — typed by the user or made by the
 * assistant — automatically refetches the right Gmail query.
 */

/** Plain fetchers — shared by the React Query hooks AND the AI tool handlers,
 *  so both go through the same cache entries. */
export function fetchEmailList(
  folder: string,
  q: string
): Promise<EmailListResponse> {
  return fetchJson(
    `/api/mail/messages?folder=${folder}&q=${encodeURIComponent(q)}`
  );
}

export function fetchEmailDetail(id: string): Promise<EmailDetail> {
  return fetchJson(`/api/mail/messages/${id}`);
}

export function useEmailList() {
  const filters = useMailStore((s) => s.filters);
  const q = buildGmailQuery(filters);
  return useQuery<EmailListResponse>({
    queryKey: ["messages", filters.folder, q],
    queryFn: () => fetchEmailList(filters.folder, q),
    staleTime: 10_000,
  });
}

export function useEmailDetail(id: string | null) {
  return useQuery<EmailDetail>({
    queryKey: ["message", id],
    queryFn: () => fetchEmailDetail(id!),
    enabled: id !== null,
    staleTime: 5 * 60_000,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) =>
      fetchJson(`/api/mail/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read }),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["messages"] }),
  });
}
