"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/** Google's "G" mark, as required by Google's sign-in branding guidelines. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

/**
 * "Continue with Google" for both sign-up and sign-in. New Google users land on
 * business setup; returning users go to their home area. Google confirms the
 * email address, so no verification email is needed.
 */
export function GoogleButton({ available }: { available: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueWithGoogle() {
    // Shown before Google credentials are configured (see .env.example).
    if (!available) {
      setError(
        "Google sign-in isn’t available yet. Please use your email for now.",
      );
      return;
    }
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/home",
      newUserCallbackURL: "/onboarding",
      errorCallbackURL: "/sign-in?error=google",
    });
    // On success the browser is already on its way to Google.
    if (error) {
      setPending(false);
      setError(
        error.status === 429
          ? "Too many attempts. Please wait a minute and try again."
          : "Google sign-in isn't available right now. Please use your email instead.",
      );
    }
  }

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={pending}
        onClick={continueWithGoogle}
        className="w-full bg-card font-medium"
      >
        <GoogleMark />
        {pending ? "Opening Google…" : "Continue with Google"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-muted-foreground">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** "or" divider between Google and the email form. */
export function OrDivider() {
  return (
    <div
      className="flex items-center gap-3 text-sm text-muted-foreground"
      role="separator"
    >
      <span className="h-px flex-1 bg-border" />
      or use your email
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
