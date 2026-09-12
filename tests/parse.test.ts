import { describe, it, expect } from "vitest";
import {
  parseAddress,
  extractBody,
  decodeEntities,
  headerValue,
  toEmailSummary,
} from "@/lib/gmail/parse";

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");

describe("parseAddress", () => {
  it('splits "Name <email>" form', () => {
    expect(parseAddress("Sarah Chen <sarah@x.com>")).toEqual({
      name: "Sarah Chen",
      email: "sarah@x.com",
    });
  });
  it("handles a bare email", () => {
    expect(parseAddress("sarah@x.com")).toEqual({
      name: "",
      email: "sarah@x.com",
    });
  });
  it("strips surrounding quotes from the display name", () => {
    expect(parseAddress('"Chen, Sarah" <s@x.com>')).toEqual({
      name: "Chen, Sarah",
      email: "s@x.com",
    });
  });
});

describe("extractBody", () => {
  it("prefers text/html and also returns text/plain from multipart/alternative", () => {
    const { html, text } = extractBody({
      mimeType: "multipart/alternative",
      parts: [
        { mimeType: "text/plain", body: { data: b64("hello") } },
        { mimeType: "text/html", body: { data: b64("<p>hello</p>") } },
      ],
    });
    expect(html).toBe("<p>hello</p>");
    expect(text).toBe("hello");
  });

  it("recurses into nested multipart/mixed", () => {
    const { html } = extractBody({
      mimeType: "multipart/mixed",
      parts: [
        {
          mimeType: "multipart/alternative",
          parts: [{ mimeType: "text/html", body: { data: b64("<b>hi</b>") } }],
        },
      ],
    });
    expect(html).toBe("<b>hi</b>");
  });

  it("returns nulls when there is no body", () => {
    expect(extractBody({ mimeType: "text/plain" })).toEqual({
      html: null,
      text: null,
    });
  });
});

describe("decodeEntities", () => {
  it("decodes the entities Gmail leaves in snippets", () => {
    expect(decodeEntities("Let&#39;s meet &amp; talk")).toBe(
      "Let's meet & talk"
    );
  });
});

describe("headerValue", () => {
  const headers = [
    { name: "From", value: "a@b.com" },
    { name: "Subject", value: "Hi" },
  ];
  it("is case-insensitive", () => {
    expect(headerValue(headers, "from")).toBe("a@b.com");
  });
  it("returns an empty string when absent", () => {
    expect(headerValue(headers, "Cc")).toBe("");
  });
});

describe("toEmailSummary", () => {
  it("maps a Gmail message into our summary shape", () => {
    const summary = toEmailSummary({
      id: "m1",
      threadId: "t1",
      labelIds: ["INBOX", "UNREAD"],
      snippet: "Hi there",
      internalDate: "1751000000000",
      payload: {
        headers: [
          { name: "From", value: "Sarah Chen <sarah@x.com>" },
          { name: "Subject", value: "Meeting Tomorrow" },
        ],
      },
    });
    expect(summary.id).toBe("m1");
    expect(summary.from).toEqual({ name: "Sarah Chen", email: "sarah@x.com" });
    expect(summary.subject).toBe("Meeting Tomorrow");
    expect(summary.unread).toBe(true);
  });

  it("falls back to (no subject) when the header is missing", () => {
    const summary = toEmailSummary({
      id: "m2",
      threadId: "t2",
      labelIds: ["INBOX"],
      snippet: "",
      internalDate: "1751000000000",
      payload: { headers: [{ name: "From", value: "a@b.com" }] },
    });
    expect(summary.subject).toBe("(no subject)");
    expect(summary.unread).toBe(false);
  });
});
