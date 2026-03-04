import { headers } from "next/headers";

export async function auth() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("x-user-id");

  return {
    userId: userId && userId.trim().length > 0 ? userId : null,
  };
}
