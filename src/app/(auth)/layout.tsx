import Link from "next/link";

import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col pt-safe pb-safe">
      <header className="mx-auto flex h-16 w-full max-w-md items-center px-4">
        <Link href="/home" aria-label="DigiFarm home">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-10">
        {children}
      </main>
    </div>
  );
}
