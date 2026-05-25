import { SignIn } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <div className="flex w-full justify-center">
      <SignIn
        routing="path"
        path="/sign-in"
        fallbackRedirectUrl="/account"
      />
    </div>
  );
}
