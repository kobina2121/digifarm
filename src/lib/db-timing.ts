import "server-only";

import { Client, type ClientConfig } from "pg";

import { logger } from "./logger";

/** Normal queries take a fraction of a second; a new connection about one. */
const SLOW_MS = 3000;
const MAX_SQL_LENGTH = 200;

export type SlowWarning = (
  details: Record<string, unknown>,
  message: string,
) => void;

/**
 * A database client that logs slow connections and queries, so a stall says
 * which step it was. Warns once when a step has been waiting too long (it may
 * never finish) and again when it ends. Logs the SQL text only: values travel
 * separately as parameters, so no customer data reaches the log.
 */
export function createTimedClient({
  slowMs = SLOW_MS,
  warn = (details, message) => logger.warn(details, message),
}: { slowMs?: number; warn?: SlowWarning } = {}) {
  function watch(step: "connection" | "query", sql?: string) {
    const details = sql ? { sql: sql.slice(0, MAX_SQL_LENGTH) } : {};
    const start = performance.now();
    const waiting = setTimeout(() => {
      warn({ ...details, waitedMs: slowMs }, `Database ${step} still waiting`);
    }, slowMs);
    waiting.unref();
    return (error?: unknown) => {
      clearTimeout(waiting);
      const tookMs = Math.round(performance.now() - start);
      if (tookMs >= slowMs) {
        warn(
          { ...details, tookMs, failed: Boolean(error) },
          `Slow database ${step}`,
        );
      }
    };
  }

  return class TimedClient extends Client {
    constructor(config?: string | ClientConfig) {
      super(config);
      // pg calls these with a callback or for a promise, depending on the route:
      // pool queries use callbacks, transactions use promises. Time both.
      const connect = this.connect.bind(this) as (
        ...args: unknown[]
      ) => unknown;
      const query = this.query.bind(this) as (...args: unknown[]) => unknown;
      this.connect = ((...args: unknown[]) =>
        timed(connect, args, watch("connection"))) as Client["connect"];
      this.query = ((...args: unknown[]) => {
        const first = args[0] as
          string | { text?: string; submit?: unknown; callback?: unknown };
        // Streaming queries report through their own events; leave them alone.
        if (typeof first === "object" && (first.submit || first.callback)) {
          return query(...args);
        }
        const sql = typeof first === "string" ? first : first.text;
        return timed(query, args, watch("query", sql));
      }) as Client["query"];
    }
  };
}

function timed(
  run: (...args: unknown[]) => unknown,
  args: unknown[],
  finish: (error?: unknown) => void,
) {
  const callback = args.at(-1);
  if (typeof callback === "function") {
    return run(...args.slice(0, -1), (error: unknown, ...rest: unknown[]) => {
      finish(error);
      callback(error, ...rest);
    });
  }
  const result = run(...args) as Promise<unknown>;
  // The caller still receives any rejection from `result` itself.
  result.then(() => finish(), finish);
  return result;
}
