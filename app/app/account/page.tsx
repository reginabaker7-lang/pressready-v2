import Link from "next/link";
import { getAuthFromServer } from "@/app/lib/clerk";

function SignedIn({ isSignedIn, children }: { isSignedIn: boolean; children: React.ReactNode }) {
  return isSignedIn ? <>{children}</> : null;
}

function SignedOut({ isSignedIn, children }: { isSignedIn: boolean; children: React.ReactNode }) {
  return isSignedIn ? null : <>{children}</>;
}

function SignInButton({ children }: { children: React.ReactNode }) {
  return <Link href="/sign-in">{children}</Link>;
}

function UserButton() {
  return <Link href="/">Sign out</Link>;
}

export default async function AccountPage() {
  const { userId } = await getAuthFromServer();
  const isSignedIn = Boolean(userId);

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 36, fontWeight: 800 }}>Account</h1>

      <SignedIn isSignedIn={isSignedIn}>
        <p style={{ marginTop: 12 }}>You’re signed in.</p>
        <div style={{ marginTop: 12 }}>
          <UserButton />
        </div>
      </SignedIn>

      <SignedOut isSignedIn={isSignedIn}>
        <p style={{ marginTop: 12 }}>Please sign in to access your account.</p>
        <div style={{ marginTop: 12 }}>
          <SignInButton>
            <button
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid currentColor",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Sign in
            </button>
          </SignInButton>
        </div>
      </SignedOut>
    </main>
  );
}
