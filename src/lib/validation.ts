import type { z } from "zod";

import { ValidationError } from "./errors";

/**
 * Validate untrusted input at a service boundary. On failure, throws a
 * ValidationError carrying one message per field path (e.g. "address.town").
 */
export function parseInput<S extends z.ZodType>(
  schema: S,
  input: unknown,
): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    fieldErrors[issue.path.join(".")] ??= issue.message;
  }
  throw new ValidationError("Please check the highlighted fields.", {
    fieldErrors,
  });
}
