import { describe, it, expect } from "vitest";
import {
  buildGmailQuery,
  toGmailDate,
  hasActiveFilters,
} from "@/lib/gmail/query";
import type { Filters } from "@/lib/types";

const inbox = (extra: Partial<Filters> = {}): Filters => ({
  folder: "inbox",
  ...extra,
});

describe("buildGmailQuery", () => {
  it("returns an empty query when no filters are set (folder is a label, not a query term)", () => {
    expect(buildGmailQuery(inbox())).toBe("");
  });

  it("maps unreadOnly to is:unread", () => {
    expect(buildGmailQuery(inbox({ unreadOnly: true }))).toBe("is:unread");
  });

  it("quotes multi-word sender and subject terms", () => {
    expect(buildGmailQuery(inbox({ from: "Sarah Chen" }))).toBe(
      'from:"Sarah Chen"'
    );
    expect(buildGmailQuery(inbox({ subject: "project update" }))).toBe(
      'subject:"project update"'
    );
  });

  it("leaves single-word terms unquoted", () => {
    expect(buildGmailQuery(inbox({ from: "sarah" }))).toBe("from:sarah");
  });

  it("formats dates as YYYY/MM/DD", () => {
    expect(buildGmailQuery(inbox({ after: "2026-06-25" }))).toBe(
      "after:2026/06/25"
    );
  });

  it("combines multiple filters in a stable order", () => {
    const q = buildGmailQuery(
      inbox({ unreadOnly: true, from: "alice", after: "2026-06-01" })
    );
    expect(q).toBe("is:unread from:alice after:2026/06/01");
  });

  it("passes a raw Gmail query through untouched", () => {
    expect(buildGmailQuery(inbox({ raw: "has:attachment" }))).toBe(
      "has:attachment"
    );
  });
});

describe("toGmailDate", () => {
  it("converts ISO dashes to slashes", () => {
    expect(toGmailDate("2026-01-09")).toBe("2026/01/09");
  });
});

describe("hasActiveFilters", () => {
  it("is false for a bare folder", () => {
    expect(hasActiveFilters(inbox())).toBe(false);
  });
  it("is true when any filter is set", () => {
    expect(hasActiveFilters(inbox({ unreadOnly: true }))).toBe(true);
    expect(hasActiveFilters(inbox({ from: "x" }))).toBe(true);
  });
});
