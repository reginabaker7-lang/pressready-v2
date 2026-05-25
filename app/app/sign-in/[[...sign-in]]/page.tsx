import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ?? "/sign-up";

  return (
    <div className="flex w-full justify-center">
      <SignIn signUpUrl={signUpUrl} forceRedirectUrl="/account" />
    </div>
  );
}
