import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

export default function AccountPage() {
  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 36, fontWeight: 800 }}>Account</h1>

      <SignedIn>
        <p style={{ marginTop: 12 }}>You’re signed in.</p>
        <div style={{ marginTop: 12 }}>
          <UserButton afterSignOutUrl="/" />
        </div>
      </SignedIn>

      <SignedOut>
        <p style={{ marginTop: 12 }}>Please sign in to access your account.</p>
        <div style={{ marginTop: 12 }}>
          <SignInButton mode="modal">
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
