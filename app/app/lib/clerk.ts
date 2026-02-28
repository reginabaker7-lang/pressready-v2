import { auth } from "@clerk/nextjs";

export async function getAuthFromServer() {
  return auth();
}
