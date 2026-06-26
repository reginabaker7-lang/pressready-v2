import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold">Sign in to PressReady</h1>
        <p className="mt-2 text-sm opacity-80">
          Create a free PressReady account to use your 3 free checks.
        </p>
      </div>
      <SignIn signUpUrl="/sign-up" />
    </div>
  );
}
