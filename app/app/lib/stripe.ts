import crypto from "node:crypto";
import { requireEnv } from "./env";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

type StripeMetadata = Record<string, string | number | boolean | null | undefined>;
type StripeFormValue = string | number | boolean | null | undefined;

function buildFormBody(data: Record<string, StripeFormValue | StripeMetadata>): URLSearchParams {
  const body = new URLSearchParams();

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;

    if (typeof value === "object" && !Array.isArray(value)) {
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        if (nestedValue === undefined || nestedValue === null) continue;
        body.append(`${key}[${nestedKey}]`, String(nestedValue));
      }
      continue;
    }

    body.append(key, String(value));
  }

  return body;
}

async function stripeRequest<T>(path: string, method: "GET" | "POST", body?: URLSearchParams): Promise<T> {
  const secretKey = requireEnv("STRIPE_SECRET_KEY");
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Stripe request failed (${response.status}): ${await response.text()}`);
  }

  return (await response.json()) as T;
}

export async function createStripeCustomer(email: string | null, userId: string) {
  return stripeRequest<{ id: string }>("/customers", "POST", buildFormBody({ email: email ?? undefined, metadata: { user_id: userId } }));
}

export async function createCheckoutSession(input: {
  customerId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
  priceId: string;
}) {
  const body = new URLSearchParams();
  body.append("customer", input.customerId);
  body.append("mode", "subscription");
  body.append("success_url", input.successUrl);
  body.append("cancel_url", input.cancelUrl);
  body.append("line_items[0][price]", input.priceId);
  body.append("line_items[0][quantity]", "1");
  body.append("metadata[user_id]", input.userId);

  return stripeRequest<{ url: string | null }>("/checkout/sessions", "POST", body);
}

export async function createPortalSession(input: { customerId: string; returnUrl: string }) {
  return stripeRequest<{ url: string }>("/billing_portal/sessions", "POST", buildFormBody({ customer: input.customerId, return_url: input.returnUrl }));
}

export async function fetchSubscription(subscriptionId: string) {
  return stripeRequest<{
    id: string;
    customer: string;
    status: string;
    items: { data: Array<{ price: { id: string } }> };
    current_period_end: number;
    cancel_at_period_end: boolean;
    metadata?: { user_id?: string };
  }>(`/subscriptions/${subscriptionId}`, "GET");
}

export function verifyStripeWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const webhookSecret = requireEnv("STRIPE_WEBHOOK_SECRET");
  if (!signatureHeader) return false;

  const parts = signatureHeader.split(",").reduce<Record<string, string[]>>((acc, part) => {
    const [key, value] = part.split("=");
    if (!key || !value) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(value);
    return acc;
  }, {});

  const timestamp = parts.t?.[0];
  const signatures = parts.v1 ?? [];
  if (!timestamp || signatures.length === 0) return false;

  const expected = crypto.createHmac("sha256", webhookSecret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
  const expectedBuffer = Buffer.from(expected);

  return signatures.some((candidate) => {
    const candidateBuffer = Buffer.from(candidate);
    if (candidateBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
  });
}
