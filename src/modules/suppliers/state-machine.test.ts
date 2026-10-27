import { describe, expect, it } from "vitest";

import {
  allowedDecisions,
  nextVerificationState,
  statusAfterVisit,
} from "./state-machine";

describe("supplier verification state machine", () => {
  it("only approves or rejects after a visit", () => {
    expect(nextVerificationState("PROSPECT", "APPROVE")).toBeNull();
    expect(nextVerificationState("VISITED", "APPROVE")).toEqual({
      status: "APPROVED",
      organizationStatus: "ACTIVE",
    });
    expect(nextVerificationState("VISITED", "REJECT")).toEqual({
      status: "REJECTED",
      organizationStatus: "PENDING",
    });
    expect(nextVerificationState("REJECTED", "APPROVE")).toBeNull();
  });

  it("suspends only approved suppliers and reinstates only suspended ones", () => {
    expect(nextVerificationState("APPROVED", "SUSPEND")?.status).toBe(
      "SUSPENDED",
    );
    expect(nextVerificationState("VISITED", "SUSPEND")).toBeNull();
    expect(nextVerificationState("SUSPENDED", "REINSTATE")?.status).toBe(
      "APPROVED",
    );
    expect(nextVerificationState("APPROVED", "REINSTATE")).toBeNull();
  });

  it("lists the decisions available in each state", () => {
    expect(allowedDecisions("PROSPECT")).toEqual([]);
    expect(allowedDecisions("VISITED")).toEqual(["APPROVE", "REJECT"]);
    expect(allowedDecisions("APPROVED")).toEqual(["SUSPEND"]);
    expect(allowedDecisions("SUSPENDED")).toEqual(["REINSTATE"]);
  });

  it("moves prospects and rejected farms to awaiting decision after a visit", () => {
    expect(statusAfterVisit("PROSPECT")).toBe("VISITED");
    expect(statusAfterVisit("REJECTED")).toBe("VISITED");
    expect(statusAfterVisit("APPROVED")).toBe("APPROVED");
  });
});
