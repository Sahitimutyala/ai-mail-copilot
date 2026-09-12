import { describe, it, expect } from "vitest";
import {
  buildMime,
  toRaw,
  encodeSubject,
  replySubject,
  forwardSubject,
} from "@/lib/gmail/mime";

describe("buildMime", () => {
  it("produces a well-formed message with a blank line before the body", () => {
    const mime = buildMime({
      to: "john@example.com",
      subject: "Meeting Tomorrow",
      body: "Let's meet at 3pm",
    });
    expect(mime).toContain("To: john@example.com");
    expect(mime).toContain("Subject: Meeting Tomorrow");
    expect(mime).toContain("\r\n\r\nLet's meet at 3pm");
  });

  it("prevents header injection by folding CR/LF in the recipient", () => {
    const mime = buildMime({
      to: "friend@x.com\r\nBcc: attacker@evil.com",
      subject: "Hi",
      body: "body",
    });
    // The smuggled Bcc must NOT become its own header line.
    expect(mime).not.toContain("\nBcc:");
    expect(mime).toContain("To: friend@x.com Bcc: attacker@evil.com");
  });

  it("includes threading headers on a reply", () => {
    const mime = buildMime({
      to: "a@b.com",
      subject: "Re: Hi",
      body: "sure",
      inReplyTo: "<orig@mail.gmail.com>",
      references: "<orig@mail.gmail.com>",
    });
    expect(mime).toContain("In-Reply-To: <orig@mail.gmail.com>");
    expect(mime).toContain("References: <orig@mail.gmail.com>");
  });
});

describe("encodeSubject", () => {
  it("passes ASCII subjects through unchanged", () => {
    expect(encodeSubject("Meeting Tomorrow")).toBe("Meeting Tomorrow");
  });
  it("RFC 2047 base64-encodes non-ASCII subjects", () => {
    const encoded = encodeSubject("Café ☕");
    expect(encoded.startsWith("=?UTF-8?B?")).toBe(true);
    const b64 = encoded.replace(/^=\?UTF-8\?B\?/, "").replace(/\?=$/, "");
    expect(Buffer.from(b64, "base64").toString("utf8")).toBe("Café ☕");
  });
});

describe("reply / forward subjects", () => {
  it("prefixes Re: without stacking", () => {
    expect(replySubject("Hello")).toBe("Re: Hello");
    expect(replySubject("Re: Hello")).toBe("Re: Hello");
  });
  it("prefixes Fwd: without stacking", () => {
    expect(forwardSubject("Hello")).toBe("Fwd: Hello");
    expect(forwardSubject("Fwd: Hello")).toBe("Fwd: Hello");
  });
});

describe("toRaw", () => {
  it("is a reversible base64url encoding", () => {
    const mime = buildMime({ to: "a@b.com", subject: "S", body: "B" });
    expect(Buffer.from(toRaw(mime), "base64url").toString("utf8")).toBe(mime);
  });
});
