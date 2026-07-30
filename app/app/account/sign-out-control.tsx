"use client";

import { useClerk } from "@clerk/nextjs";

export function SignOutControl() {
  const { signOut } = useClerk();

  return (
    <button
      type="button"
      className="rounded-lg border border-[var(--pressready-gold)] px-4 py-2 text-sm font-semibold uppercase tracking-wide transition hover:bg-[var(--pressready-gold)] hover:text-[var(--pressready-black)]"
      onClick={() => signOut({ redirectUrl: "/" })}
    >
      Sign out
    </button>
  );
}
