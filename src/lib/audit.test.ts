import { describe, expect, it } from "vitest";

import { createUser } from "@/test/factories";
import { hasTestDatabase } from "@/test/setup";

import { audit } from "./audit";
import { db } from "./db";

describe.runIf(hasTestDatabase)("audit log (integration)", () => {
  it("records entries inside a transaction", async () => {
    const actor = await createUser({ platformRole: "ADMIN" });
    const entityId = crypto.randomUUID();
    await db.$transaction((tx) =>
      audit(tx, actor, {
        action: "test.created",
        entityType: "Test",
        entityId,
        after: { ok: true },
      }),
    );
    const row = await db.auditLog.findFirstOrThrow({ where: { entityId } });
    expect(row.actorUserId).toBe(actor.userId);
    expect(row.actorRole).toBe("ADMIN");
  });

  it("cannot be updated or deleted, even by the app's database role", async () => {
    const entityId = crypto.randomUUID();
    await db.$transaction((tx) =>
      audit(tx, null, { action: "test.created", entityType: "Test", entityId }),
    );
    const row = await db.auditLog.findFirstOrThrow({ where: { entityId } });

    await expect(
      db.auditLog.update({
        where: { id: row.id },
        data: { action: "tampered" },
      }),
    ).rejects.toThrow(/append-only/);
    await expect(db.auditLog.delete({ where: { id: row.id } })).rejects.toThrow(
      /append-only/,
    );

    const after = await db.auditLog.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(after.action).toBe("test.created");
  });
});
