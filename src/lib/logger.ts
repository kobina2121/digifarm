import "server-only";

import pino, { type DestinationStream, type Logger } from "pino";

/** Never log these, wherever they appear in a log object. */
export const REDACT_PATHS = [
  "password",
  "*.password",
  "newPassword",
  "*.newPassword",
  "token",
  "*.token",
  "secret",
  "*.secret",
  "authorization",
  "*.authorization",
  "headers.authorization",
  "headers.cookie",
  "cookie",
  "*.cookie",
  "signature",
  "*.signature",
  "headers['x-paystack-signature']",
  "databaseUrl",
  "*.databaseUrl",
];

export function createLogger(
  destination?: DestinationStream,
  level?: string,
): Logger {
  return pino(
    {
      level: level ?? process.env.LOG_LEVEL ?? "info",
      base: { service: "digifarm" },
      redact: { paths: REDACT_PATHS, censor: "[redacted]" },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    destination,
  );
}

export const logger = createLogger();
