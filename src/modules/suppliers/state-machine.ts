import type {
  OrganizationStatus,
  VerificationStatus,
} from "@/generated/prisma/enums";

import type { DECISIONS } from "./schemas";

export type Decision = (typeof DECISIONS)[number];

/** Allowed verification decisions: from → decision → resulting statuses. */
const TRANSITIONS: Record<
  Decision,
  {
    from: VerificationStatus[];
    to: VerificationStatus;
    organization: OrganizationStatus;
  }
> = {
  APPROVE: { from: ["VISITED"], to: "APPROVED", organization: "ACTIVE" },
  REJECT: { from: ["VISITED"], to: "REJECTED", organization: "PENDING" },
  SUSPEND: { from: ["APPROVED"], to: "SUSPENDED", organization: "SUSPENDED" },
  REINSTATE: { from: ["SUSPENDED"], to: "APPROVED", organization: "ACTIVE" },
};

export function nextVerificationState(
  current: VerificationStatus,
  decision: Decision,
) {
  const rule = TRANSITIONS[decision];
  if (!rule.from.includes(current)) return null;
  return { status: rule.to, organizationStatus: rule.organization };
}

export function allowedDecisions(current: VerificationStatus): Decision[] {
  return (Object.keys(TRANSITIONS) as Decision[]).filter((d) =>
    TRANSITIONS[d].from.includes(current),
  );
}

/** Recording a visit moves a prospect (or a rejected farm being re-checked) to "awaiting decision". */
export function statusAfterVisit(
  current: VerificationStatus,
): VerificationStatus {
  return current === "PROSPECT" || current === "REJECTED" ? "VISITED" : current;
}
