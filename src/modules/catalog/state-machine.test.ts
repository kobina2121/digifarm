import { describe, expect, it } from "vitest";

import { allowedListingActions, nextListingStatus } from "./state-machine";

describe("listing status changes", () => {
  it("publishes drafts and pauses or resumes listings on sale", () => {
    expect(nextListingStatus("DRAFT", "PUBLISH")).toBe("ACTIVE");
    expect(nextListingStatus("ACTIVE", "PAUSE")).toBe("PAUSED");
    expect(nextListingStatus("PAUSED", "RESUME")).toBe("ACTIVE");
  });

  it("never brings an archived listing back", () => {
    expect(allowedListingActions("ARCHIVED")).toEqual([]);
    expect(nextListingStatus("ARCHIVED", "RESUME")).toBeNull();
    expect(nextListingStatus("ARCHIVED", "PUBLISH")).toBeNull();
  });

  it("rejects changes that make no sense from the current status", () => {
    expect(nextListingStatus("ACTIVE", "PUBLISH")).toBeNull();
    expect(nextListingStatus("DRAFT", "RESUME")).toBeNull();
    expect(allowedListingActions("ACTIVE")).toEqual(["PAUSE", "ARCHIVE"]);
  });
});
