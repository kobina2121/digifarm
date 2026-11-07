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

  EMAIL_TRANSPORT: z.enum(["console", "resend"]).default("console"),
  EMAIL_FROM: z.string().min(3),
  RESEND_API_KEY: optionalSetting.refine(
    (v) => v === undefined || v.startsWith("re_"),
    "RESEND_API_KEY should start with re_",
  ),

  // Google sign-in is optional: set both to show "Continue with Google".
  GOOGLE_CLIENT_ID: optionalSetting,
  GOOGLE_CLIENT_SECRET: optionalSetting,

  STORAGE_DRIVER: z.enum(["local", "s3", "vercel-blob"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default(".storage"),
  // S3-compatible bucket (Cloudflare R2 or AWS S3) for STORAGE_DRIVER=s3.
  S3_ENDPOINT: optionalSetting.pipe(z.url().optional()),
  S3_BUCKET: optionalSetting,
  S3_ACCESS_KEY_ID: optionalSetting,
  S3_SECRET_ACCESS_KEY: optionalSetting,
  // R2 uses "auto"; for AWS S3, the bucket's region (e.g. eu-west-2).
  S3_REGION: z.string().trim().min(1).default("auto"),
  // Vercel Blob (STORAGE_DRIVER=vercel-blob): Vercel sets BLOB_STORE_ID when a
  // store is connected; BLOB_READ_WRITE_TOKEN is for running elsewhere.
  BLOB_STORE_ID: optionalSetting,
  BLOB_READ_WRITE_TOKEN: optionalSetting,

  // "fake" is a development stand-in that never touches real money; "none"
  // runs the site with checkout closed until a provider is set up.
  PAYMENT_PROVIDER: z.enum(["fake", "paystack", "none"]).default("fake"),
  // Test keys only until D11, D12 and D14 are resolved (ROADMAP §7).
  PAYSTACK_SECRET_KEY: optionalSetting.refine(
    (v) => v === undefined || v.startsWith("sk_test_"),
    "Only Paystack test keys (sk_test_…) are allowed until live payments are approved",
  ),

  // Scheduled jobs (/api/cron/*) must send "Authorization: Bearer <CRON_SECRET>".
  CRON_SECRET: optionalSetting.refine(
    (v) => v === undefined || v.length >= 16,
    "CRON_SECRET must be at least 16 characters",
  ),
});

export type Env = z.infer<typeof envSchema>;

/**
 * On Vercel's production deployment the site's address comes from Vercel
 * itself (the project's main domain, custom or *.vercel.app), so renaming the
 * domain can't leave sign-in pointing at an old address. APP_URL and
 * BETTER_AUTH_URL still apply everywhere else.
 */
function withVercelAddress(
  source: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const host = source.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (source.VERCEL_ENV !== "production" || !host) return source;
  const url = `https://${host}`;
  return { ...source, APP_URL: url, BETTER_AUTH_URL: url };
}

type SettingValue = <K extends keyof Env>(key: K) => Env[K] | undefined;

/** Rules between settings. Each failure is one line of the error. */
function settingProblems(value: SettingValue): string[] {
  const problems: string[] = [];
  const appEnv = value("APP_ENV") ?? "development";
  const email = value("EMAIL_TRANSPORT");
  const storage = value("STORAGE_DRIVER");
  const payments = value("PAYMENT_PROVIDER");

  if (!value("GOOGLE_CLIENT_ID") !== !value("GOOGLE_CLIENT_SECRET")) {
    problems.push(
      "Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or neither",
    );
  }
  if (storage === "s3") {
    const missing = (
      [
        "S3_ENDPOINT",
        "S3_BUCKET",
        "S3_ACCESS_KEY_ID",
        "S3_SECRET_ACCESS_KEY",
      ] as const
    ).filter((name) => !value(name));
    if (missing.length) {
      problems.push(`STORAGE_DRIVER=s3 needs ${missing.join(", ")}`);
    }
  }
  if (
    storage === "vercel-blob" &&
    !value("BLOB_STORE_ID") &&
    !value("BLOB_READ_WRITE_TOKEN")
  ) {
    problems.push(
      "STORAGE_DRIVER=vercel-blob needs a connected Blob store (BLOB_STORE_ID) or BLOB_READ_WRITE_TOKEN",
    );
  }
  if (email === "resend" && !value("RESEND_API_KEY")) {
    problems.push("EMAIL_TRANSPORT=resend needs RESEND_API_KEY");
  }
  if (payments === "paystack" && !value("PAYSTACK_SECRET_KEY")) {
    problems.push("PAYMENT_PROVIDER=paystack needs PAYSTACK_SECRET_KEY");
  }
  if (appEnv !== "development") {
    if (email === "console") {
      problems.push(
        `EMAIL_TRANSPORT=console is not allowed when APP_ENV=${appEnv}`,
      );
    }
    if (storage === "local") {
      problems.push(
        `STORAGE_DRIVER=local is not allowed when APP_ENV=${appEnv}`,
      );
    }
    if (payments === "fake") {
      problems.push(
        `PAYMENT_PROVIDER=fake is not allowed when APP_ENV=${appEnv}`,
      );
    }
  }
  return problems;
}

/**
 * Validates every setting and reports all problems in one error, so a failed
 * deploy names everything that needs fixing instead of one thing per build.
 */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const input = withVercelAddress(source);
  const result = envSchema.safeParse(input);
  // Each setting on its own (with its default), so the rules between settings
  // still run when some unrelated setting is missing or invalid.
  const value: SettingValue = (key) => {
    const one = envSchema.shape[key].safeParse(input[key]);
    return one.success ? (one.data as Env[typeof key]) : undefined;
  };
  const problems = [
    ...(result.success
      ? []
      : result.error.issues.map(
          (issue) => `${issue.path.join(".")}: ${issue.message}`,
        )),
    ...settingProblems(value),
  ];
  if (problems.length || !result.success) {
    throw new Error(
      `Invalid environment configuration:\n${problems.map((p) => `  - ${p}`).join("\n")}`,
    );
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
