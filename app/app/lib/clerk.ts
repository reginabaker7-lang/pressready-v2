import { auth } from "@clerk/nextjs/server";

export async function getAuthFromServer() {
  const _secretKey = process.env.CLERK_SECRET_KEY;
  void _secretKey;

  return auth();
}
