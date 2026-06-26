import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold">Create your PressReady account</h1>
        <p className="mt-2 text-sm opacity-80">
          Create a free PressReady account to use your 3 free checks.
        </p>
      </div>
      <SignUp signInUrl="/sign-in" />
    </div>
  );
}
