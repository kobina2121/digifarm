import "server-only";

import { isAppError } from "./errors";
import { logger } from "./logger";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Run a server action body and convert failures into a safe result for the form.
 * Known application errors show their message; anything else is logged and
 * shown as a generic error so internals never reach the browser.
 */
export async function runAction<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (isAppError(error)) {
      const fieldErrors = error.details?.fieldErrors as
        Record<string, string> | undefined;
      return { ok: false, error: error.message, fieldErrors };
    }
    logger.error({ err: error }, "Unhandled error in server action");
    return {
      ok: false,
      error: "Something went wrong on our side. Please try again.",
    };
  }
}
