import { Writable } from "node:stream";

import { describe, expect, it } from "vitest";

import { createLogger } from "./logger";

function capture() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  return { logger: createLogger(stream, "info"), lines };
}

describe("logger", () => {
  it("redacts passwords, tokens, cookies and signatures", () => {
    const { logger, lines } = capture();
    logger.info(
      {
        password: "hunter2",
        user: { email: "a@b.c", password: "hunter2", token: "tok_123" },
        headers: {
          authorization: "Bearer abc",
          cookie: "session=xyz",
          "x-paystack-signature": "sig",
        },
      },
      "sign-in attempt",
    );
    const output = lines.join("");
    for (const secret of [
      "hunter2",
      "tok_123",
      "Bearer abc",
      "session=xyz",
      '"sig"',
    ]) {
      expect(output).not.toContain(secret);
    }
    expect(output).toContain("a@b.c");
    expect(output).toContain("[redacted]");
  });
});
