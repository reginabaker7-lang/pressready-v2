import type { ReactNode } from "react";

export function ClerkProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export async function auth() {
  return { userId: null };
}
