import { auth } from "@clerk/nextjs/server";

export async function getAuthFromServer() {
  return auth();
}
