import { clerkClient } from "@clerk/nextjs/server";

export type PlanName = "free" | "pro";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
]);

type SubscriptionMetadata = {
  plan?: PlanName;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSubscriptionStatus?: string;
};

function planFromStatus(status: string | null | undefined): PlanName {
  return status && ACTIVE_SUBSCRIPTION_STATUSES.has(status) ? "pro" : "free";
}

export function toSubscriptionMetadata(args: {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeSubscriptionStatus?: string | null;
}): SubscriptionMetadata {
  const stripeSubscriptionStatus = args.stripeSubscriptionStatus ?? undefined;

  return {
    plan: planFromStatus(stripeSubscriptionStatus),
    stripeCustomerId: args.stripeCustomerId ?? undefined,
    stripeSubscriptionId: args.stripeSubscriptionId ?? undefined,
    stripeSubscriptionStatus,
  };
}

export async function updateUserSubscriptionMetadata(
  userId: string,
  metadata: SubscriptionMetadata,
) {
  const client = await clerkClient();

  return client.users.updateUserMetadata(userId, {
    privateMetadata: {
      subscription: metadata,
    },
  });
}

export async function getUserPlan(userId: string): Promise<PlanName> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const subscription = user.privateMetadata?.subscription as
    | SubscriptionMetadata
    | undefined;

  return subscription?.plan === "pro" ? "pro" : "free";
}

export async function findUserIdByStripeCustomerId(
  stripeCustomerId: string,
): Promise<string | null> {
  const client = await clerkClient();
  let offset = 0;
  const pageSize = 100;

  while (true) {
    const result = await client.users.getUserList({
      limit: pageSize,
      offset,
      orderBy: "-created_at",
    });

    const user = result.data.find((candidate) => {
      const subscription = candidate.privateMetadata?.subscription as
        | SubscriptionMetadata
        | undefined;

      return subscription?.stripeCustomerId === stripeCustomerId;
    });

    if (user) {
      return user.id;
    }

    if (result.data.length < pageSize) {
      return null;
    }

    offset += pageSize;
  }
}
