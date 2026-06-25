This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Stripe webhook + plan verification

### Vercel project setup
- **Root Directory** should be `app` (this folder contains `package.json`).
- Webhook endpoint should be:
  - `https://<vercel-domain>/api/stripe/webhook`

### Required env vars
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`

### Local smoke checks
1. Run the app:
   ```bash
   npm run dev
   ```
2. Confirm `/check` is routed:
   ```bash
   curl -i http://localhost:3000/check
   ```
   Expect `HTTP/1.1 200`.
3. Confirm webhook route exists and is POST-only:
   ```bash
   curl -i http://localhost:3000/api/stripe/webhook
   ```
   Expect `HTTP/1.1 405 Method Not Allowed`.
4. Confirm plan endpoint:
   ```bash
   curl -i http://localhost:3000/api/plan
   ```

### Production checklist
- Stripe webhook endpoint in Dashboard is exactly:
  - `https://<vercel-domain>/api/stripe/webhook`
- Keep **exactly one** webhook endpoint for that URL in Stripe. If multiple endpoints point to the same Vercel URL, Stripe can sign deliveries with different secrets and signature verification will fail.
- Webhook events selected at minimum:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- Copy the `whsec_...` signing secret from that single endpoint and set `STRIPE_WEBHOOK_SECRET` in Vercel for the correct environment(s).
- Trigger a new deployment immediately after updating `STRIPE_WEBHOOK_SECRET`, then verify the latest commit SHA is active.
