import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/sign-in";

  return (
    <div className="flex w-full justify-center">
      <SignUp signInUrl={signInUrl} forceRedirectUrl="/account" />
    </div>
  );
}
