import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/account(.*)",
  "/history(.*)",
  "/report(.*)",
]);

const isProtectedApiRoute = createRouteMatcher(["/api/checks(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request) || isProtectedApiRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
