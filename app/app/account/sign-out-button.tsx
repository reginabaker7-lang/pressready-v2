"use client";

import { SignOutButton } from "@clerk/nextjs";

export default function AccountSignOutButton() {
  return (
    <SignOutButton>
      <button className="border border-current px-4 py-2 rounded-lg" type="button">
        Sign out
      </button>
    </SignOutButton>
  );
}
