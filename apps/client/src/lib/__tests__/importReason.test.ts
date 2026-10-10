import { describe, expect, it } from "bun:test";
import { describeImportReason } from "@/lib/importReason";

describe("describeImportReason", () => {
  it("never shows raw XML from the bucket", () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Error xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Resource>/x</Resource><Code>InvalidKey</Code></Error>';
    const text = describeImportReason(`bucket upload HTTP 400: ${xml}`);
    expect(text).not.toContain("<");
    expect(text).toContain("rejected a file name");
  });

  it("explains the YouTube bot check and unavailable videos", () => {
    expect(describeImportReason("ERROR: Sign in to confirm you're not a bot")).toContain("cookies");
    expect(describeImportReason("Video unavailable")).toContain("private or unavailable");
  });

  it("returns an empty string without a reason and truncates long unknown ones", () => {
    expect(describeImportReason(undefined)).toBe("");
    expect(describeImportReason("x".repeat(500)).length).toBeLessThanOrEqual(140);
  });
});
