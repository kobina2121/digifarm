import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { db } from "./db";
import { sendEmail } from "./email";
import { env } from "./env";

const config = env();

export const auth = betterAuth({
  appName: "DigiFarm",
  baseURL: config.BETTER_AUTH_URL,
  secret: config.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your DigiFarm password",
        text: `Hello ${user.name},\n\nUse this link to choose a new password. It expires in 1 hour.\n\n${url}\n\nIf you didn't ask for this, you can ignore this email.`,
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    // Signing in before confirming re-sends the link (rate-limited above).
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Confirm your email for DigiFarm",
        text: `Hello ${user.name},\n\nConfirm your email address to start using DigiFarm:\n\n${url}\n\nIf you didn't create an account, you can ignore this email.`,
      });
    },
  },

  user: {
    additionalFields: {
      // input: false — users can never set these themselves (no self-promotion to staff).
      platformRole: { type: "string", input: false, defaultValue: "USER" },
      status: { type: "string", input: false, defaultValue: "ACTIVE" },
      phone: { type: "string", required: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    // Saves two database round trips per request. Account status and role are
    // still read from the database on every request (src/lib/session.ts), so a
    // suspension takes effect immediately; only sign-out-elsewhere lags ≤ 5 min.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 300, max: 3 },
      "/send-verification-email": { window: 300, max: 3 },
    },
  },

  advanced: {
    useSecureCookies: config.NODE_ENV === "production",
  },

  // Lets server actions set auth cookies. Must stay last.
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
