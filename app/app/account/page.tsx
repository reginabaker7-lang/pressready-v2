import Link from "next/link";
import { getAuthFromServer } from "@/app/lib/clerk";

export default async function AccountPage() {
  const { userId } = await getAuthFromServer();
  const isSignedIn = Boolean(userId);

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 36, fontWeight: 800 }}>Account</h1>

      {isSignedIn ? (
        <>
          <p style={{ marginTop: 12 }}>You’re signed in.</p>
          <nav style={{ marginTop: 12, display: "flex", gap: 16 }}>
            <Link href="/pricing">View pricing</Link>
            <Link href="/history">View history</Link>
          </nav>
        </>
      ) : (
        <>
          <p style={{ marginTop: 12 }}>Please sign in to access your account.</p>
          <div style={{ marginTop: 12 }}>
            <Link href="/sign-in">Sign in</Link>
          </div>
        </>
      )}
    </main>
  );
}
