import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

const clerkProxy = clerkMiddleware();

export function proxy(request: NextRequest) {
  return clerkProxy(request);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
