# Subscription + Stripe + Clerk + Supabase Integration Audit

Date: 2026-02-28

## Requested files

- ❌ `app/lib/supabaseAdmin.ts` (missing)
- ❌ `app/lib/stripe.ts` (missing)
- ❌ `app/api/plan/route.ts` (missing)
- ❌ `app/api/stripe/checkout/route.ts` (missing)
- ❌ `app/api/stripe/portal/route.ts` (missing)
- ❌ `app/api/stripe/webhook/route.ts` (missing)
- ❌ `app/pricing/page.tsx` (missing at this exact path)
- ❌ `app/account/page.tsx` (missing at this exact path)

### Closest existing equivalents

- ✅ `app/app/pricing/page.tsx` exists and is a static placeholder page with links to Home and Account only (no plans, prices, Stripe, or checkout calls).
- ✅ `app/app/account/page.tsx` exists and conditionally shows signed-in/signed-out UI, linking to Pricing and History (no subscription status or billing actions).

## String search results

- `STRIPE_WEBHOOK_SECRET`: no matches
- `/api/plan`: no matches
- `subscriptions`: no matches
- `stripe_customer_id`: no matches
- `stripe_subscription_id`: no matches
- `@clerk/nextjs`: matches in:
  - `app/tsconfig.json` (`paths` alias for `@clerk/nextjs` -> `./clerk-nextjs`)
  - `app/app/layout.tsx` (`import { ClerkProvider } from "@clerk/nextjs"`)
- `UserButton`: no matches

## Pro gating status

- **PDF download**: available to all users in `app/app/check/page.tsx` via `Download Report (PDF)` button and in `app/app/report/report-client.tsx` via `Print / Save PDF`; no auth/plan checks.
- **History**: available to all users at `app/app/history/page.tsx` + `history-client.tsx`; uses browser `localStorage` and is not account-bound.
- **Unlimited checks**: no quota/limit system found; `runChecks` is client-side and unrestricted.

## Additional integration observations

- No Stripe dependency in `app/package.json`.
- No Supabase dependency in `app/package.json`.
- No Clerk dependency in `app/package.json` (only a local alias stub `app/clerk-nextjs.tsx`).
- `app/app/account/page.tsx` imports `@/app/lib/clerk`, but `app/app/lib/clerk.ts` does not exist.

## Smallest set of changes needed to finish integration

1. Add server-side auth helper for Clerk (`app/app/lib/clerk.ts`) and install/configure official Clerk package/env.
2. Add Stripe client helper (`app/app/lib/stripe.ts`) and install `stripe` package.
3. Add Supabase admin helper (`app/app/lib/supabaseAdmin.ts`) and install Supabase SDK.
4. Implement `app/app/api/plan/route.ts` to return current plan status from Supabase using Clerk user identity.
5. Implement Stripe endpoints under `app/app/api/stripe/{checkout,portal,webhook}/route.ts`:
   - checkout session creation
   - billing portal session creation
   - webhook verification with `STRIPE_WEBHOOK_SECRET`
   - write `stripe_customer_id`, `stripe_subscription_id`, and subscription state to Supabase
6. Wire `app/app/pricing/page.tsx` to real plan cards + checkout action.
7. Wire `app/app/account/page.tsx` to show live plan status and “Manage billing” action.
8. Add Pro gating checks:
   - gate PDF export actions
   - gate history access/retention rules
   - enforce check limits for non-Pro users
9. Add migrations/schema for subscription fields and indexes in Supabase.
10. Add end-to-end tests for checkout -> webhook -> plan status -> gated UI paths.
