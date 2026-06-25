"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";

export function SignOutButton() {
  const { signOut } = useClerk();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await signOut({ redirectUrl: "/" });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <button
      className="border border-current px-4 py-2 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
      disabled={isSigningOut}
      onClick={handleSignOut}
      type="button"
    >
      {isSigningOut ? "Signing out..." : "Sign out"}
    </button>
  );
}
