import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { requireEnv } from "./env";

type ClerkVerifyResponse = {
  user_id?: string;
  session_id?: string;
};

const CLERK_VERIFY_URL = "https://api.clerk.com/v1/sessions/verify";

async function verifySessionToken(token: string): Promise<ClerkVerifyResponse | null> {
  if (!token) {
    return null;
  }

  const secretKey = requireEnv("CLERK_SECRET_KEY");
  const response = await fetch(CLERK_VERIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secretKey}`,
    },
    body: JSON.stringify({ token }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as ClerkVerifyResponse;
}

export async function getAuthFromRequest(request: NextRequest): Promise<{ userId: string | null }> {
  const token = request.cookies.get("__session")?.value ?? "";
  const session = await verifySessionToken(token);

  return {
    userId: session?.user_id ?? null,
  };
}

export async function getAuthFromServer(): Promise<{ userId: string | null }> {
  const cookieStore = await cookies();
  const token = cookieStore.get("__session")?.value ?? "";
  const session = await verifySessionToken(token);

  return {
    userId: session?.user_id ?? null,
  };
}
