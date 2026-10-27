import "server-only";

import { z } from "zod";

/**
 * Server environment, validated once at first use. A missing or malformed
 * variable fails loudly at startup instead of surfacing as a runtime bug.
 */
/** An optional setting where an empty value (e.g. `GOOGLE_CLIENT_ID=`) means "not set". */
const optionalSetting = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().min(1).optional(),
);

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  // Where this copy is deployed. NODE_ENV is "production" for any build, even a local one.
  APP_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
  APP_URL: z.url(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  DATABASE_URL: z.string().startsWith("postgres"),

  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url(),

  EMAIL_TRANSPORT: z.enum(["console"]).default("console"),
  EMAIL_FROM: z.string().min(3),

  // Google sign-in is optional: set both to show "Continue with Google".
  GOOGLE_CLIENT_ID: optionalSetting,
  GOOGLE_CLIENT_SECRET: optionalSetting,

  STORAGE_DRIVER: z.enum(["local"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default(".storage"),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  if (!result.data.GOOGLE_CLIENT_ID !== !result.data.GOOGLE_CLIENT_SECRET) {
    throw new Error(
      "Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or neither",
    );
  }
  if (result.data.APP_ENV !== "development") {
    if (result.data.EMAIL_TRANSPORT === "console") {
      throw new Error(
        `EMAIL_TRANSPORT=console is not allowed when APP_ENV=${result.data.APP_ENV}`,
      );
    }
    if (result.data.STORAGE_DRIVER === "local") {
      throw new Error(
        `STORAGE_DRIVER=local is not allowed when APP_ENV=${result.data.APP_ENV}`,
      );
    }
  }
  return result.data;
}

let cached: Env | undefined;

export function env(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}

/** Whether "Continue with Google" is available (both Google credentials are set). */
export function googleSignInEnabled(): boolean {
  return Boolean(env().GOOGLE_CLIENT_ID && env().GOOGLE_CLIENT_SECRET);
}
