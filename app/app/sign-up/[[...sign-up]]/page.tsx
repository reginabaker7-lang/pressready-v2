import { SignUp } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <div className="flex w-full justify-center">
      <SignUp
        routing="path"
        path="/sign-up"
        fallbackRedirectUrl="/account"
      />
    </div>
  );
}
