"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function SignOutButton({
  className,
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      disabled={pending}
      className={cn(
        onDark && "text-white hover:bg-white/10 hover:text-white",
        className,
      )}
      onClick={() =>
        startTransition(async () => {
          await authClient.signOut();
          // A full page load drops pages cached while signed in, so Back
          // can't show the last person's account on a shared phone.
          window.location.replace("/sign-in");
        })
      }
    >
      <LogOut aria-hidden />
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
