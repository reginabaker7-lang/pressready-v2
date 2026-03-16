import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex w-full justify-center">
      <SignUp />
    </div>
  );
}
